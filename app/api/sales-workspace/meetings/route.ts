import { NextResponse } from "next/server";
import { createSmartMeetingResult } from "@/lib/smart-meeting";
import { createSupabaseAdminClient, getCurrentSalesSession } from "@/lib/sales-session";

export const runtime = "nodejs";

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

export async function GET() {
  try {
    const session = await getCurrentSalesSession();

    if (!session) {
      return NextResponse.json({ error: "Sales login required." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("meetings")
      .select("id,title,client_id,summary,created_at,sales_user_id")
      .eq("user_id", session.ownerId)
      .eq("sales_user_id", session.salesUser.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ meetings: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load meetings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSalesSession();

    if (!session) {
      return NextResponse.json({ error: "Sales login required." }, { status: 401 });
    }

    const body = await request.json();

    const title = String(body.title || "Client Meeting").trim();
    const clientId = String(body.client_id || "").trim();
    const notes = String(body.notes || "").trim();

    if (!clientId) {
      return NextResponse.json({ error: "Please select a client." }, { status: 400 });
    }

    if (!notes) {
      return NextResponse.json({ error: "Please paste meeting notes first." }, { status: 400 });
    }

    const smart = createSmartMeetingResult(title, notes);
    const supabase = createSupabaseAdminClient();

    const { data: meeting, error } = await supabase
      .from("meetings")
      .insert({
        user_id: session.ownerId,
        sales_user_id: session.salesUser.id,
        client_id: clientId,
        title,
        transcript: notes,
        summary: smart.summary,
        action_items: smart.actionItems
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const taskRows = smart.actionItems.map((item, index) => ({
      user_id: session.ownerId,
      sales_user_id: session.salesUser.id,
      client_id: clientId,
      meeting_id: String(meeting.id),
      title: item,
      status: "pending",
      priority: index === 0 ? "high" : "medium",
      due_at: createTaskDueDate(index),
      source: "sales_meeting",
      notes: `Auto-created from sales meeting: ${title}`
    }));

    const taskInsert = await supabase
      .from("tasks")
      .insert(taskRows)
      .select("*");

    return NextResponse.json({
      success: true,
      meeting,
      summary: smart.summary,
      actionItems: smart.actionItems,
      tasksCreated: taskInsert.error ? 0 : taskInsert.data?.length || 0,
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
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create meeting.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}