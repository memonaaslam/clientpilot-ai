import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateValue));
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardShell>
        <div className="empty-state">
          <h2>Please sign in first</h2>
          <p className="muted">Login to view your ClientPilot workspace.</p>
        </div>
      </DashboardShell>
    );
  }

  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const clientsQuery = supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const meetingsQuery = supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const pendingRemindersQuery = supabase
    .from("reminders")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "done")
    .order("due_at", { ascending: true })
    .limit(6);

  const todayRemindersQuery = supabase
    .from("reminders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("status", "done")
    .gte("due_at", todayStart.toISOString())
    .lte("due_at", todayEnd.toISOString());

  const [clientsResult, meetingsResult, pendingResult, todayResult] = await Promise.all([
    clientsQuery,
    meetingsQuery,
    pendingRemindersQuery,
    todayRemindersQuery
  ]);

  const pendingReminders = pendingResult.data || [];
  const overdueCount = pendingReminders.filter(
    (reminder: any) => new Date(reminder.due_at) < now
  ).length;

  const nextReminder = pendingReminders[0];

  return (
    <DashboardShell>
      <div className="page-hero dashboard-main-hero">
        <div>
          <span className="badge">ClientPilot Workspace</span>
          <h1 style={{ fontSize: 46 }}>Dashboard</h1>
          <p className="muted">
            Manage clients, meeting notes, proposals, and follow-up reminders from one place.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>{todayResult.count || 0}</strong>
          <span>Due today</span>
        </div>
      </div>

      <section className="dashboard-stat-grid">
        <article className="dashboard-stat-card">
          <span>Total Clients</span>
          <strong>{clientsResult.count || 0}</strong>
          <Link href="/dashboard/clients">View clients</Link>
        </article>

        <article className="dashboard-stat-card">
          <span>Meetings Saved</span>
          <strong>{meetingsResult.count || 0}</strong>
          <Link href="/dashboard/meetings">View meetings</Link>
        </article>

        <article className="dashboard-stat-card">
          <span>Pending Follow-Ups</span>
          <strong>{pendingReminders.length}</strong>
          <Link href="/dashboard/reminders">Open reminders</Link>
        </article>

        <article className="dashboard-stat-card warning">
          <span>Missed Follow-Ups</span>
          <strong>{overdueCount}</strong>
          <Link href="/dashboard/reminders">Fix now</Link>
        </article>
      </section>

      <section className="dashboard-action-grid">
        <article className="dashboard-focus-card">
          <span className="badge">Next Best Action</span>

          {nextReminder ? (
            <>
              <h2>{nextReminder.title}</h2>
              <p className="muted">
                {nextReminder.client_name ? `${nextReminder.client_name} · ` : ""}
                {formatDate(nextReminder.due_at)}
              </p>

              <div className="dashboard-focus-actions">
                <Link className="btn gold" href="/dashboard/reminders">
                  Open Reminder
                </Link>
                <Link className="btn secondary" href="/dashboard/upload">
                  Upload Meeting
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2>No pending follow-up</h2>
              <p className="muted">
                Add a client meeting or create a reminder to start your follow-up system.
              </p>

              <div className="dashboard-focus-actions">
                <Link className="btn gold" href="/dashboard/upload">
                  Upload Meeting
                </Link>
                <Link className="btn secondary" href="/dashboard/reminders">
                  Create Reminder
                </Link>
              </div>
            </>
          )}
        </article>

        <article className="dashboard-quick-card">
          <span className="badge">Quick Actions</span>
          <h2>Start your next client task</h2>

          <div className="dashboard-quick-actions">
            <Link href="/dashboard/clients">Add Client</Link>
            <Link href="/dashboard/upload">Process Meeting</Link>
            <Link href="/dashboard/proposals">Create Proposal</Link>
            <Link href="/dashboard/reminders">Set Reminder</Link>
          </div>
        </article>
      </section>

      <section className="dashboard-reminder-card">
        <div className="section-head">
          <div>
            <span className="badge">Follow-Up Autopilot</span>
            <h2>Upcoming reminders</h2>
            <p className="muted">Your next proposal, call, WhatsApp, and payment follow-ups.</p>
          </div>

          <Link className="btn secondary" href="/dashboard/reminders">
            View All
          </Link>
        </div>

        {pendingReminders.length === 0 ? (
          <div className="empty-state mini">
            <h2>No reminders yet</h2>
            <p className="muted">Create reminders so you never lose a client because of missed follow-up.</p>
          </div>
        ) : (
          <div className="dashboard-reminder-list">
            {pendingReminders.map((reminder: any) => (
              <article key={reminder.id}>
                <div>
                  <strong>{reminder.title}</strong>
                  <span>
                    {reminder.client_name ? `${reminder.client_name} · ` : ""}
                    {formatDate(reminder.due_at)}
                  </span>
                </div>

                <em>{reminder.priority}</em>
              </article>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}