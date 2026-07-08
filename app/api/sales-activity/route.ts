import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/sales-session";

export const runtime = "nodejs";

type BasicRow = {
  id: string;
  sales_user_id?: string | null;
  created_at?: string | null;
  status?: string | null;
  due_at?: string | null;
};

async function safeSelect(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  table: string,
  ownerId: string,
  columns: string
) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("user_id", ownerId);

  if (error) {
    return [];
  }

  return (data || []) as unknown as BasicRow[];
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Login session required." },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid login session." },
        { status: 401 }
      );
    }

    const ownerId = authData.user.id;

    const { data: salesUsers, error: salesError } = await supabase
      .from("sales_users")
      .select("id,staff_id,name,email,phone,status,created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (salesError) {
      return NextResponse.json({ error: salesError.message }, { status: 500 });
    }

    const [clients, meetings, tasks, reminders, proposals] = await Promise.all([
      safeSelect(supabase, "clients", ownerId, "id,sales_user_id,created_at"),
      safeSelect(supabase, "meetings", ownerId, "id,sales_user_id,created_at"),
      safeSelect(supabase, "tasks", ownerId, "id,sales_user_id,created_at,status,due_at"),
      safeSelect(supabase, "reminders", ownerId, "id,sales_user_id,created_at,status,due_at"),
      safeSelect(supabase, "proposals", ownerId, "id,sales_user_id,created_at,status")
    ]);

    const now = new Date();
    const nextSevenDays = new Date();
    nextSevenDays.setDate(now.getDate() + 7);

    const activity = (salesUsers || []).map((user) => {
      const salesUserId = String(user.id);

      const userClients = clients.filter((item) => item.sales_user_id === salesUserId);
      const userMeetings = meetings.filter((item) => item.sales_user_id === salesUserId);
      const userTasks = tasks.filter((item) => item.sales_user_id === salesUserId);
      const userReminders = reminders.filter((item) => item.sales_user_id === salesUserId);
      const userProposals = proposals.filter((item) => item.sales_user_id === salesUserId);

      const followUpsDue = userReminders.filter((item) => {
        if (!item.due_at) return false;

        const due = new Date(item.due_at);

        return item.status !== "done" && due >= now && due <= nextSevenDays;
      }).length;

      const completedTasks = userTasks.filter((item) => item.status === "done").length;

      const rawScore =
        userClients.length * 8 +
        userMeetings.length * 12 +
        userTasks.length * 4 +
        userReminders.length * 5 +
        userProposals.length * 10 +
        completedTasks * 6;

      const activityScore = Math.min(100, rawScore);

      return {
        id: user.id,
        staff_id: user.staff_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        clientsAdded: userClients.length,
        meetingsAdded: userMeetings.length,
        tasksCreated: userTasks.length,
        remindersCreated: userReminders.length,
        proposalsCreated: userProposals.length,
        followUpsDue,
        completedTasks,
        activityScore
      };
    });

    const totals = {
      salesUsers: salesUsers?.length || 0,
      clientsAdded: activity.reduce((sum, item) => sum + item.clientsAdded, 0),
      meetingsAdded: activity.reduce((sum, item) => sum + item.meetingsAdded, 0),
      tasksCreated: activity.reduce((sum, item) => sum + item.tasksCreated, 0),
      remindersCreated: activity.reduce((sum, item) => sum + item.remindersCreated, 0),
      proposalsCreated: activity.reduce((sum, item) => sum + item.proposalsCreated, 0),
      followUpsDue: activity.reduce((sum, item) => sum + item.followUpsDue, 0)
    };

    return NextResponse.json({
      success: true,
      totals,
      activity
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load sales activity.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

