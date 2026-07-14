import OpenAI, { toFile } from "openai";
import { NextResponse } from "next/server";

import {
  analyzeMeetingWithAI
} from "@/lib/ai/analyze-meeting";

import {
  attachOwnerApiUsageToMeeting,
  calculateTranscriptionCostUsd,
  recordOwnerApiUsage,
  type TranscriptionUsageSummary
} from "@/lib/owner-api-usage";

import {
  getPlanLimitStatus
} from "@/lib/subscription";

import {
  createSupabaseServerClient
} from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const MAX_AUDIO_SIZE_BYTES =
  25 * 1024 * 1024;

const SUPPORTED_AUDIO_EXTENSIONS = [
  ".mp3",
  ".mp4",
  ".mpeg",
  ".mpga",
  ".m4a",
  ".wav",
  ".webm"
];

const SUPPORTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "video/mp4",
  "video/webm"
];

const EMPTY_TRANSCRIPTION_USAGE:
  TranscriptionUsageSummary = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    audioSeconds: 0,
    audioInputTokens: 0,
    textInputTokens: 0
  };

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing. Add it to .env.local and Vercel."
    );
  }

  return new OpenAI({
    apiKey
  });
}

function isFile(
  value: FormDataEntryValue | null
): value is File {
  return (
    value !== null &&
    typeof value === "object" &&
    "arrayBuffer" in value &&
    "size" in value &&
    "name" in value
  );
}

function getFileExtension(
  fileName: string
) {
  const index = fileName.lastIndexOf(".");

  return index === -1
    ? ""
    : fileName.slice(index).toLowerCase();
}

function isTextFile(file: File) {
  const fileName = file.name.toLowerCase();

  return (
    file.type.startsWith("text/") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md")
  );
}

function isSupportedAudioFile(file: File) {
  const extension = getFileExtension(
    file.name
  );

  return (
    SUPPORTED_AUDIO_EXTENSIONS.includes(
      extension
    ) ||
    SUPPORTED_AUDIO_TYPES.includes(
      file.type
    )
  );
}

async function getTextFromTextFile(
  file: File
) {
  if (!isTextFile(file)) {
    return "";
  }

  return (await file.text()).trim();
}

function getUsageNumber(
  record: Record<string, unknown>,
  key: string
) {
  const value = Number(record[key]);

  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
}

function getUsageRecord(
  value: unknown
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

function extractTranscriptionUsage(
  transcription: unknown
): TranscriptionUsageSummary {
  const transcriptionRecord =
    getUsageRecord(transcription);

  const usageRecord = getUsageRecord(
    transcriptionRecord.usage
  );

  const usageType = String(
    usageRecord.type || ""
  ).toLowerCase();

  if (usageType === "duration") {
    const audioSeconds = getUsageNumber(
      usageRecord,
      "seconds"
    );

    return {
      ...EMPTY_TRANSCRIPTION_USAGE,
      audioSeconds
    };
  }

  const inputTokens = Math.round(
    getUsageNumber(
      usageRecord,
      "input_tokens"
    )
  );

  const outputTokens = Math.round(
    getUsageNumber(
      usageRecord,
      "output_tokens"
    )
  );

  const reportedTotal = Math.round(
    getUsageNumber(
      usageRecord,
      "total_tokens"
    )
  );

  const inputDetails = getUsageRecord(
    usageRecord.input_token_details
  );

  const topLevelDuration =
    getUsageNumber(
      transcriptionRecord,
      "duration"
    );

  return {
    inputTokens,
    outputTokens,
    totalTokens:
      reportedTotal ||
      inputTokens + outputTokens,
    audioSeconds: topLevelDuration,
    audioInputTokens: Math.round(
      getUsageNumber(
        inputDetails,
        "audio_tokens"
      )
    ),
    textInputTokens: Math.round(
      getUsageNumber(
        inputDetails,
        "text_tokens"
      )
    )
  };
}

async function transcribeAudioFile(
  file: File,
  userId: string
) {
  if (file.size <= 0) {
    throw new Error(
      "The selected audio file is empty."
    );
  }

  if (
    file.size > MAX_AUDIO_SIZE_BYTES
  ) {
    throw new Error(
      "Audio file is larger than 25 MB. Please compress it or upload a shorter recording."
    );
  }

  if (!isSupportedAudioFile(file)) {
    throw new Error(
      "Unsupported audio format. Please use MP3, MP4, MPEG, MPGA, M4A, WAV, or WEBM."
    );
  }

  const model =
    process.env
      .OPENAI_TRANSCRIPTION_MODEL?.trim() ||
    "gpt-4o-transcribe";

  try {
    const openai = createOpenAIClient();

    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    const uploadFile = await toFile(
      buffer,
      file.name || "meeting-audio.mp3",
      {
        type:
          file.type || "audio/mpeg"
      }
    );

    const transcription =
      await openai.audio.transcriptions.create({
        file: uploadFile,
        model,
        response_format: "json"
      });

    const transcript =
      transcription.text?.trim();

    if (!transcript) {
      throw new Error(
        "The audio was processed, but no speech could be transcribed."
      );
    }

    const usage =
      extractTranscriptionUsage(
        transcription
      );

    const estimatedCostUsd =
      calculateTranscriptionCostUsd({
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        audioSeconds: usage.audioSeconds
      });

    const usageRecordId =
      await recordOwnerApiUsage({
        userId,
        service: "audio_transcriptions",
        operation: "meeting_transcription",
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        audioSeconds: usage.audioSeconds,
        fileSizeBytes: file.size,
        estimatedCostUsd,
        status: "success",
        metadata: {
          file_name: file.name,
          file_type:
            file.type || null,
          audio_input_tokens:
            usage.audioInputTokens,
          text_input_tokens:
            usage.textInputTokens
        }
      });

    return {
      transcript,
      model,
      usage: {
        ...usage,
        estimatedCostUsd
      },
      usageRecordId
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown transcription error.";

    await recordOwnerApiUsage({
      userId,
      service: "audio_transcriptions",
      operation: "meeting_transcription",
      model,
      fileSizeBytes: file.size,
      status: "failed",
      metadata: {
        file_name: file.name,
        file_type: file.type || null,
        error: errorMessage
      }
    });

    throw error;
  }
}

function createTaskDueDate(
  index: number
) {
  const date = new Date();

  if (index === 0) {
    date.setHours(17, 0, 0, 0);
  } else {
    date.setDate(
      date.getDate() + index
    );

    date.setHours(10, 0, 0, 0);
  }

  return date.toISOString();
}

async function createTimelineEntry({
  supabase,
  userId,
  clientId,
  meetingId,
  title
}: {
  supabase: Awaited<
    ReturnType<
      typeof createSupabaseServerClient
    >
  >;
  userId: string;
  clientId: string | null;
  meetingId: string | null;
  title: string;
}) {
  if (!clientId) {
    return;
  }

  const payload: Record<
    string,
    unknown
  > = {
    user_id: userId,
    client_id: clientId,
    event_type: "meeting_uploaded",
    title: "Meeting uploaded",
    description:
      `AI transcription and analysis completed for: ${title}`,
    related_id: meetingId,
    created_at:
      new Date().toISOString()
  };

  const firstAttempt = await supabase
    .from("client_timeline")
    .insert(payload as never);

  if (!firstAttempt.error) {
    return;
  }

  const fallbackPayload: Record<
    string,
    unknown
  > = {
    user_id: userId,
    client_id: clientId,
    type: "meeting_uploaded",
    title: "Meeting uploaded",
    description:
      `AI transcription and analysis completed for: ${title}`,
    meeting_id: meetingId,
    created_at:
      new Date().toISOString()
  };

  await supabase
    .from("client_timeline")
    .insert(fallbackPayload as never);
}

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Please login first."
        },
        {
          status: 401
        }
      );
    }

    const limitStatus =
      await getPlanLimitStatus(user.id);

    if (!limitStatus.allowed) {
      return NextResponse.json(
        {
          error:
            `Monthly meeting upload limit reached for ${limitStatus.planConfig.name}. Upgrade your plan to upload more meetings.`,
          usage: limitStatus.usage,
          limit: limitStatus.limit,
          plan:
            limitStatus.subscription.plan
        },
        {
          status: 402
        }
      );
    }

    const formData =
      await request.formData();

    const title =
      String(
        formData.get("title") ||
          formData.get(
            "meetingTitle"
          ) ||
          ""
      ).trim() || "Client Meeting";

    const clientId =
      String(
        formData.get("clientId") ||
          formData.get("client_id") ||
          ""
      ).trim() || null;

    let transcript = String(
      formData.get("transcript") ||
        formData.get("notes") ||
        formData.get("content") ||
        ""
    ).trim();

    const fileValue =
      formData.get("file") ||
      formData.get("audio");

    let transcriptionSource:
      | "pasted-notes"
      | "text-file"
      | "audio-ai" = "pasted-notes";

    let transcriptionModel:
      | string
      | null = null;

    let transcriptionUsage:
      | (TranscriptionUsageSummary & {
          estimatedCostUsd: number;
        })
      | null = null;

    let transcriptionUsageRecordId:
      | string
      | null = null;

    if (
      !transcript &&
      isFile(fileValue)
    ) {
      if (isTextFile(fileValue)) {
        transcript =
          await getTextFromTextFile(
            fileValue
          );

        transcriptionSource =
          "text-file";
      } else {
        const transcription =
          await transcribeAudioFile(
            fileValue,
            user.id
          );

        transcript =
          transcription.transcript;

        transcriptionModel =
          transcription.model;

        transcriptionUsage =
          transcription.usage;

        transcriptionUsageRecordId =
          transcription.usageRecordId;

        transcriptionSource =
          "audio-ai";
      }
    }

    if (!transcript) {
      return NextResponse.json(
        {
          error:
            "Please upload an audio file or paste meeting notes."
        },
        {
          status: 400
        }
      );
    }

    const {
      analysis: smart,
      mode: analysisMode,
      model: analysisModel,
      usage: analysisUsage,
      usageRecordId:
        analysisUsageRecordId
    } = await analyzeMeetingWithAI(
      title,
      transcript,
      {
        userId: user.id
      }
    );

    const basePayload: Record<
      string,
      unknown
    > = {
      user_id: user.id,
      title,
      transcript
    };

    if (clientId) {
      basePayload.client_id = clientId;
    }

    let insertPayload: Record<
      string,
      unknown
    > = {
      ...basePayload,
      summary: smart.summary,
      action_items:
        smart.actionItems
    };

    let {
      data: meeting,
      error
    } = await supabase
      .from("meetings")
      .insert(insertPayload as never)
      .select("*")
      .single();

    if (error) {
      insertPayload = {
        ...basePayload,
        summary: smart.summary
      };

      const retry = await supabase
        .from("meetings")
        .insert(insertPayload as never)
        .select("*")
        .single();

      meeting = retry.data;
      error = retry.error;
    }

    if (error) {
      insertPayload = basePayload;

      const retry = await supabase
        .from("meetings")
        .insert(insertPayload as never)
        .select("*")
        .single();

      meeting = retry.data;
      error = retry.error;
    }

    if (error) {
      return NextResponse.json(
        {
          error: error.message
        },
        {
          status: 500
        }
      );
    }

    const meetingId =
      meeting &&
      typeof meeting === "object" &&
      "id" in meeting &&
      meeting.id
        ? String(meeting.id)
        : null;

    await attachOwnerApiUsageToMeeting(
      [
        transcriptionUsageRecordId,
        analysisUsageRecordId
      ],
      meetingId
    );

    const taskRows =
      smart.actionItems.map(
        (item, index) => ({
          user_id: user.id,
          client_id: clientId,
          meeting_id: meetingId,
          title: item,
          status: "pending",
          priority:
            index === 0
              ? "high"
              : "medium",
          due_at:
            createTaskDueDate(index),
          source: "meeting",
          notes:
            `AI-created from meeting: ${title}`
        })
      );

    let createdTasks: Record<
      string,
      unknown
    >[] = [];

    if (taskRows.length > 0) {
      const taskInsert = await supabase
        .from("tasks")
        .insert(taskRows as never)
        .select("*");

      if (!taskInsert.error) {
        createdTasks =
          (taskInsert.data ||
            []) as Record<
            string,
            unknown
          >[];
      }
    }

    await createTimelineEntry({
      supabase,
      userId: user.id,
      clientId,
      meetingId,
      title
    });

    const aiMode =
      transcriptionSource === "audio-ai"
        ? analysisMode === "openai"
          ? "openai-transcription-and-analysis"
          : "openai-transcription-fallback-analysis"
        : analysisMode === "openai"
          ? "openai-notes-analysis"
          : "smart-notes";

    return NextResponse.json({
      success: true,
      meeting,
      meetingId,
      transcript,
      transcriptionSource,
      transcriptionModel,
      summary: smart.summary,
      actionItems:
        smart.actionItems,
      tasks: createdTasks,
      tasksCreated:
        createdTasks.length,
      followUp: smart.followUp,
      proposalPoints:
        smart.proposalPoints,
      budget: smart.budget,
      timeline: smart.timeline,
      decisionMaker:
        smart.decisionMaker,
      requirements:
        smart.requirements,
      painPoints: smart.painPoints,
      objections: smart.objections,
      closingProbability:
        smart.closingProbability,
      sentiment: smart.sentiment,
      proposalDraft:
        smart.proposalDraft,
      autopilot: {
        temperature:
          smart.temperature,
        score: smart.score,
        stage: smart.stage,
        nextBestAction:
          smart.nextBestAction,
        whatsappMessage:
          smart.whatsappMessage,
        emailMessage:
          smart.emailMessage,
        automationPlan:
          smart.automationPlan,
        missingInfo:
          smart.missingInfo,
        dealSignals:
          smart.dealSignals,
        riskSignals:
          smart.riskSignals
      },
      aiMode,
      analysisMode,
      analysisModel,
      apiUsage: {
        transcription:
          transcriptionUsage,
        analysis: analysisUsage,
        estimatedTotalCostUsd:
          Number(
            (
              (transcriptionUsage
                ?.estimatedCostUsd || 0) +
              analysisUsage
                .estimatedCostUsd
            ).toFixed(8)
          )
      },
      usage:
        limitStatus.usage + 1,
      limit: limitStatus.limit,
      remaining: Math.max(
        limitStatus.limit -
          limitStatus.usage -
          1,
        0
      ),
      plan:
        limitStatus.subscription.plan
    });
  } catch (error) {
    console.error(
      "Meeting transcription and analysis error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to process meeting.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: 500
      }
    );
  }
}