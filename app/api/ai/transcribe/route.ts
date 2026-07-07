import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPlanLimitStatus } from "@/lib/subscription";

export const runtime = "nodejs";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const SUPPORTED_AUDIO_EXTENSIONS = ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"];

function getDemoTranscript(title: string) {
  return `Demo transcript for ${title || "client meeting"}.

Client discussed their business needs, current challenges, budget expectations, and preferred timeline.

Key points:
- Client wants a clear professional solution.
- Client needs fast follow-up.
- Client asked for pricing and next steps.
- Client prefers a simple proposal with deliverables, timeline, and cost.

This is demo AI output. Add OPENAI_API_KEY and set USE_DEMO_AI=false to enable real transcription.`;
}

function createSummary(transcript: string) {
  const clean = transcript.replace(/\s+/g, " ").trim();
  const short = clean.length > 500 ? `${clean.slice(0, 500)}...` : clean;

  return `Meeting summary: ${short}`;
}

function createActionItems() {
  return [
    "Send a professional proposal to the client.",
    "Follow up on pricing and timeline.",
    "Add client requirements to the CRM.",
    "Move the client to the correct pipeline stage."
  ];
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

async function transcribeAudio(file: File) {
  const useDemo = process.env.USE_DEMO_AI === "true";
  const apiKey = process.env.OPENAI_API_KEY;

  if (useDemo || !apiKey) {
    return {
      transcript: "",
      mode: "demo"
    };
  }

  if (file.size > MAX_AUDIO_SIZE) {
    throw new Error("Audio file must be 25 MB or smaller.");
  }

  const extension = getFileExtension(file.name);

  if (!SUPPORTED_AUDIO_EXTENSIONS.includes(extension)) {
    throw new Error("Unsupported audio type. Use mp3, mp4, mpeg, mpga, m4a, wav, or webm.");
  }

  const openai = new OpenAI({
    apiKey
  });

  const model = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

  const result = await openai.audio.transcriptions.create({
    file,
    model,
    response_format: "text"
  });

  return {
    transcript: typeof result === "string" ? result : String((result as any).text || ""),
    mode: "openai"
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please login first." }, { status: 401 });
    }

    const limitStatus = await getPlanLimitStatus(user.id);

    if (!limitStatus.allowed) {
      return NextResponse.json(
        {
          error: `Monthly meeting upload limit reached for ${limitStatus.planConfig.name}. Upgrade your plan to upload more meetings.`,
          usage: limitStatus.usage,
          limit: limitStatus.limit,
          plan: limitStatus.subscription.plan
        },
        { status: 402 }
      );
    }

    const formData = await request.formData();

    const title =
      String(formData.get("title") || formData.get("meetingTitle") || "").trim() ||
      "Client Meeting";

    const clientId = String(formData.get("clientId") || formData.get("client_id") || "").trim();

    const manualTranscript = String(
      formData.get("transcript") || formData.get("notes") || ""
    ).trim();

    const fileValue = formData.get("file") || formData.get("audio");
    const audioFile =
      fileValue && typeof fileValue === "object" && "size" in fileValue
        ? (fileValue as File)
        : null;

    let transcript = manualTranscript;
    let aiMode = "manual";

    if (audioFile && Number(audioFile.size) > 0) {
      const result = await transcribeAudio(audioFile);

      if (result.mode === "demo") {
        transcript = getDemoTranscript(title);
        aiMode = "demo";
      } else {
        transcript = result.transcript;
        aiMode = "openai";
      }
    }

    if (!transcript) {
      transcript = getDemoTranscript(title);
      aiMode = "demo";
    }

    const summary = createSummary(transcript);
    const actionItems = createActionItems();

    const basePayload: Record<string, any> = {
      user_id: user.id,
      title,
      transcript
    };

    if (clientId) {
      basePayload.client_id = clientId;
    }

    let insertPayload: Record<string, any> = {
      ...basePayload,
      summary,
      action_items: actionItems
    };

    let { data: meeting, error } = await supabase
      .from("meetings")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      insertPayload = {
        ...basePayload,
        summary
      };

      const retry = await supabase
        .from("meetings")
        .insert(insertPayload)
        .select("*")
        .single();

      meeting = retry.data;
      error = retry.error;
    }

    if (error) {
      insertPayload = basePayload;

      const retry = await supabase
        .from("meetings")
        .insert(insertPayload)
        .select("*")
        .single();

      meeting = retry.data;
      error = retry.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      meeting,
      meetingId: meeting?.id,
      transcript,
      summary,
      actionItems,
      aiMode,
      usage: limitStatus.usage + 1,
      limit: limitStatus.limit,
      remaining: Math.max(limitStatus.limit - limitStatus.usage - 1, 0),
      plan: limitStatus.subscription.plan
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to transcribe meeting.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}