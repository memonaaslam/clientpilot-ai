import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Reminder ID is required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { data: existingReminder, error: findError } =
      await supabase
        .from("reminders")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { error: findError.message },
        { status: 500 }
      );
    }

    if (!existingReminder) {
      return NextResponse.json(
        { error: "Reminder not found." },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (typeof body.status === "string") {
      const status = body.status.trim().toLowerCase();

      if (!["pending", "done"].includes(status)) {
        return NextResponse.json(
          {
            error:
              "Reminder status must be pending or done."
          },
          { status: 400 }
        );
      }

      updates.status = status;
    }

    if (body.due_at) {
      const dueDate = new Date(body.due_at);

      if (Number.isNaN(dueDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid reminder date." },
          { status: 400 }
        );
      }

      updates.due_at = dueDate.toISOString();
    }

    if (typeof body.title === "string") {
      const title = body.title.trim();

      if (!title) {
        return NextResponse.json(
          { error: "Reminder title is required." },
          { status: 400 }
        );
      }

      updates.title = title;
    }

    if (typeof body.notes === "string") {
      updates.notes = body.notes.trim() || null;
    }

    if (typeof body.priority === "string") {
      updates.priority = body.priority.trim();
    }

    if (typeof body.reminder_type === "string") {
      updates.reminder_type =
        body.reminder_type.trim();
    }

    const { data, error } = await supabase
      .from("reminders")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reminder: data
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update reminder.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Reminder ID is required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

    const { data: reminder, error: findError } =
      await supabase
        .from("reminders")
        .select("id")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { error: findError.message },
        { status: 500 }
      );
    }

    if (!reminder) {
      return NextResponse.json(
        { error: "Reminder not found." },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to delete reminder.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}