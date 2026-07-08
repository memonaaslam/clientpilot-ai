import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/sales-session";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

function eventDate(item: any) {
  return item.due_at || item.created_at || new Date().toISOString();
}

function formatEvent(type: string, item: any) {
  const labelMap: Record<string, string> = {
    client: "Client Created",
    meeting: "Meeting Added",
    task: "Task Created",
    reminder: "Reminder Scheduled",
    proposal: "Proposal Created"
  };

  return {
    id: `${type}-${item.id}`,
    type,
    label: labelMap[type] || type,
    title: item.title || item.name || "Untitled",
    status: item.status || null,
    date: eventDate(item),
    description:
      item.summary ||
      item.notes ||
      item.address ||
      (item.due_at ? `Due: ${new Date(item.due_at).toLocaleString()}` : "")
  };
}

async function safeQuery(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  table: string,
  ownerId: string,
  clientId: string,
  columns: string
) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("user_id", ownerId)
    .eq("client_id", clientId);

  if (error) return [];

  return data || [];
}

export async function GET(request: Request) {
  try {
    const authSupabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Owner login required." }, { status: 401 });
    }

    const url = new URL(request.url);
    const clientId = url.searchParams.get("client_id") || "";

    const supabase = createSupabaseAdminClient();

    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id,name,phone,email,address,created_at,sales_user_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (clientsError) {
      return NextResponse.json({ error: clientsError.message }, { status: 500 });
    }

    const selectedClientId = clientId || clients?.[0]?.id || "";

    if (!selectedClientId) {
      return NextResponse.json({
        clients: clients || [],
        selectedClient: null,
        timeline: []
      });
    }

    const selectedClient = (clients || []).find((client) => String(client.id) === String(selectedClientId)) || null;

    const [meetings, tasks, reminders, proposals] = await Promise.all([
      safeQuery(supabase, "meetings", user.id, selectedClientId, "id,title,summary,created_at,client_id,sales_user_id"),
      safeQuery(supabase, "tasks", user.id, selectedClientId, "id,title,status,due_at,created_at,client_id,sales_user_id"),
      safeQuery(supabase, "reminders", user.id, selectedClientId, "id,title,status,due_at,created_at,client_id,notes,sales_user_id"),
      safeQuery(supabase, "proposals", user.id, selectedClientId, "id,title,status,created_at,client_id,sales_user_id")
    ]);

    const timeline = [
      selectedClient ? formatEvent("client", selectedClient) : null,
      ...meetings.map((item) => formatEvent("meeting", item)),
      ...tasks.map((item) => formatEvent("task", item)),
      ...reminders.map((item) => formatEvent("reminder", item)),
      ...proposals.map((item) => formatEvent("proposal", item))
    ]
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      clients: clients || [],
      selectedClient,
      timeline
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load client timeline.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
