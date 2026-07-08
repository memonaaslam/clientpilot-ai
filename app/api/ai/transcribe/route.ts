import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPlanLimitStatus } from "@/lib/subscription";
import { createSmartMeetingResult } from "@/lib/smart-meeting";

export const runtime = "nodejs";

async function getTextFromFile(file: File) {
  const fileName = file.name.toLowerCase();

  if (
    file.type.startsWith("text/") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md")
  ) {
    return await file.text();
  }

  return "";
}

function createTaskDueDate(index: number) {
  const date = new Date();

  if (index === 0) {
    date.setHours(17, 0, 0, 0);
  } else {
    date.setDate(date.getDate() + index);
    date.setHours(10, 0, 0, 0);
  }

  return date.toISOString();
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

    let notes = String(
      formData.get("transcript") || formData.get("notes") || formData.get("content") || ""
    ).trim();

    const fileValue = formData.get("file") || formData.get("audio");

    if (!notes && fileValue && typeof fileValue === "object" && "size" in fileValue) {
      notes = await getTextFromFile(fileValue as File);
    }

    if (!notes) {
      return NextResponse.json(
        {
          error: "Please paste meeting notes first."
        },
        { status: 400 }
      );
    }

    const smart = createSmartMeetingResult(title, notes);

    const basePayload: Record<string, any> = {
      user_id: user.id,
      title,
      transcript: notes
    };

    if (clientId) {
      basePayload.client_id = clientId;
    }

    let insertPayload: Record<string, any> = {
      ...basePayload,
      summary: smart.summary,
      action_items: smart.actionItems
    };

    let { data: meeting, error } = await supabase
      .from("meetings")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      insertPayload = {
        ...basePayload,
        summary: smart.summary
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

    const meetingId = meeting?.id ? String(meeting.id) : "";

    const taskRows = smart.actionItems.map((item, index) => ({
      user_id: user.id,
      client_id: clientId || null,
      meeting_id: meetingId || null,
      title: item,
      status: "pending",
      priority: index === 0 ? "high" : "medium",
      due_at: createTaskDueDate(index),
      source: "meeting",
      notes: `Auto-created from meeting: ${title}`
    }));

    let createdTasks: any[] = [];

    const taskInsert = await supabase
      .from("tasks")
      .insert(taskRows)
      .select("*");

    if (!taskInsert.error) {
      createdTasks = taskInsert.data || [];
    }

    return NextResponse.json({
      success: true,
      meeting,
      meetingId,
      transcript: notes,
      summary: smart.summary,
      actionItems: smart.actionItems,
      tasks: createdTasks,
      tasksCreated: createdTasks.length,
      followUp: smart.followUp,
      proposalPoints: smart.proposalPoints,
      autopilot: {
        temperature: smart.temperature,
        score: smart.score,
        stage: smart.stage,
        nextBestAction: smart.nextBestAction,
        whatsappMessage: smart.whatsappMessage,
        emailMessage: smart.emailMessage,
        automationPlan: smart.automationPlan,
        missingInfo: smart.missingInfo,
        dealSignals: smart.dealSignals,
        riskSignals: smart.riskSignals
      },
      aiMode: "smart-free",
      usage: limitStatus.usage + 1,
      limit: limitStatus.limit,
      remaining: Math.max(limitStatus.limit - limitStatus.usage - 1, 0),
      plan: limitStatus.subscription.plan
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process meeting.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}