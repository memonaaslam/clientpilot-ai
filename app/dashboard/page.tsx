import { DashboardShell } from "@/components/DashboardShell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [clients, meetings, tasks] = await Promise.all([
    user ? supabase.from("clients").select("id", { count: "exact", head: true }).eq("user_id", user.id) : null,
    user ? supabase.from("meetings").select("id", { count: "exact", head: true }).eq("user_id", user.id) : null,
    user ? supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "done") : null
  ]);

  return (
    <DashboardShell>
      <div className="header-row">
        <div>
          <h1 style={{ fontSize: 46 }}>Dashboard</h1>
          <p className="muted">Your AI business memory and follow-up command center.</p>
        </div>
      </div>
      {!user ? <div className="card"><p>Please login first from /login.</p></div> : null}
      <div className="grid three">
        <div className="kpi"><strong>{clients?.count ?? 0}</strong><span className="muted">Clients</span></div>
        <div className="kpi"><strong>{meetings?.count ?? 0}</strong><span className="muted">Meetings</span></div>
        <div className="kpi"><strong>{tasks?.count ?? 0}</strong><span className="muted">Open Tasks</span></div>
      </div>
      <div className="grid two" style={{ marginTop: 22 }}>
        <div className="card">
          <h3>Best next action</h3>
          <p className="muted">Upload your first client meeting and let AI create the summary, follow-up message, and tasks.</p>
        </div>
        <div className="card">
          <h3>Product direction</h3>
          <p className="muted">Start with service businesses. Later add WhatsApp integrations, proposals, invoices, and AI sales agents.</p>
        </div>
      </div>
    </DashboardShell>
  );
}
