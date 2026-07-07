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
          error:
            "Free Smart Mode works with pasted meeting notes or .txt files. Real audio transcription can be enabled later with an OpenAI key."
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

    return NextResponse.json({
      success: true,
      meeting,
      meetingId: meeting?.id,
      transcript: notes,
      summary: smart.summary,
      actionItems: smart.actionItems,
      followUp: smart.followUp,
      proposalPoints: smart.proposalPoints,
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