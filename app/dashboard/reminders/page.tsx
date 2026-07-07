import { DashboardShell } from "@/components/DashboardShell";
import { ReminderCenter } from "@/components/ReminderCenter";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ClientOption = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

export default async function RemindersPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardShell>
        <div className="empty-state">
          <h2>Please sign in first</h2>
          <p className="muted">Login to manage your follow-up reminders.</p>
        </div>
      </DashboardShell>
    );
  }

  let clientRows: ClientOption[] = [];

  const fullClients = await supabase
    .from("clients")
    .select("id,name,phone,email")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (fullClients.data) {
    clientRows = fullClients.data as ClientOption[];
  } else {
    const fallback = await supabase
      .from("clients")
      .select("id,name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    clientRows = (fallback.data || []).map((client: any) => ({
      id: String(client.id),
      name: String(client.name),
      phone: null,
      email: null
    }));
  }

  return (
    <DashboardShell>
      <div className="page-hero">
        <div>
          <span className="badge">Follow-Up Autopilot</span>
          <h1 style={{ fontSize: 46 }}>Reminders</h1>
          <p className="muted">
            Create follow-up reminders, add them to Google Calendar, and never lose a client because of missed action.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>Auto</strong>
          <span>Follow-ups</span>
        </div>
      </div>

      <ReminderCenter clients={clientRows} />
    </DashboardShell>
  );
}