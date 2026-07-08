import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getCurrentSalesSession } from "@/lib/sales-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getCurrentSalesSession();

    if (!session) {
      return NextResponse.json({ error: "Sales login required." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", session.ownerId)
      .eq("sales_user_id", session.salesUser.id)
      .order("due_at", { ascending: true })
      .limit(30);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reminders: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load reminders.";
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

    if (!body.title || !body.due_at) {
      return NextResponse.json(
        { error: "Reminder title and due date are required." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const payload = {
      user_id: session.ownerId,
      sales_user_id: session.salesUser.id,
      client_id: body.client_id ? String(body.client_id) : null,
      client_name: body.client_name ? String(body.client_name) : null,
      client_phone: body.client_phone ? String(body.client_phone) : null,
      title: String(body.title),
      reminder_type: body.reminder_type ? String(body.reminder_type) : "follow_up",
      priority: body.priority ? String(body.priority) : "medium",
      status: "pending",
      due_at: new Date(body.due_at).toISOString(),
      notes: body.notes ? String(body.notes) : null
    };

    const { data, error } = await supabase
      .from("reminders")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, reminder: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create reminder.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}