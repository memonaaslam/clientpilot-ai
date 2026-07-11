import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { LostLeadRescuePanel } from "@/components/LostLeadRescuePanel";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type ClientRow = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  created_at?: string | null;
};

type ReminderRow = {
  id: string;
  client_id?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  title: string;
  status: string;
  due_at: string;
  priority?: string | null;
  reminder_type?: string | null;
};

type MeetingRow = {
  id: string;
  client_id?: string | null;
  title?: string | null;
  created_at?: string | null;
};

type ProposalRow = {
  id: string;
  title: string;
  client_name?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

function formatDate(dateValue?: string | null) {
  if (!dateValue) return "No date";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateValue));
}

function daysBetween(dateValue?: string | null) {
  if (!dateValue) return 0;

  const start = new Date(dateValue).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
}

async function safeCount(query: any) {
  const result = await query;
  if (result.error) return 0;
  return result.count || 0;
}

async function loadClients(supabase: any, userId: string): Promise<ClientRow[]> {
  const full = await supabase
    .from("clients")
    .select("id,name,phone,email,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (full.data) {
    return full.data.map((client: any) => ({
      id: String(client.id),
      name: String(client.name || "Unnamed Client"),
      phone: client.phone || null,
      email: client.email || null,
      created_at: client.created_at || null
    }));
  }

  const fallback = await supabase
    .from("clients")
    .select("id,name,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (fallback.data || []).map((client: any) => ({
    id: String(client.id),
    name: String(client.name || "Unnamed Client"),
    phone: null,
    email: null,
    created_at: client.created_at || null
  }));
}

async function loadRows<T>(query: any): Promise<T[]> {
  const result = await query;
  if (result.error) return [];
  return (result.data || []) as T[];
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

  const clients = await loadClients(supabase, user.id);

  const meetings = await loadRows<MeetingRow>(
    supabase
      .from("meetings")
      .select("id,client_id,title,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
  );

  const reminders = await loadRows<ReminderRow>(
    supabase
      .from("reminders")
      .select("id,client_id,client_name,client_phone,title,status,due_at,priority,reminder_type")
      .eq("user_id", user.id)
      .order("due_at", { ascending: true })
  );

  const proposals = await loadRows<ProposalRow>(
    supabase
      .from("proposals")
      .select("id,title,client_name,status,updated_at")
      .eq("user_id", user.id)
      .eq("deleted", false)
      .order("updated_at", { ascending: false })
      .limit(5)
  );

  const pendingReminders = reminders.filter((item) => item.status !== "done");
  const overdueReminders = pendingReminders.filter((item) => new Date(item.due_at) < now);

  const dueTodayReminders = pendingReminders.filter((item) => {
    const date = new Date(item.due_at);
    return date >= todayStart && date <= todayEnd;
  });

  const activeProposalCount = proposals.length;

  const tasksCount = await safeCount(
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "done")
  );

  const activityByClient = new Map<string, string>();

  clients.forEach((client) => {
    if (client.created_at) {
      activityByClient.set(client.id, client.created_at);
    }
  });

  meetings.forEach((meeting) => {
    if (!meeting.client_id || !meeting.created_at) return;

    const clientId = String(meeting.client_id);
    const current = activityByClient.get(clientId);

    if (!current || new Date(meeting.created_at) > new Date(current)) {
      activityByClient.set(clientId, meeting.created_at);
    }
  });

  const clientsWithPendingReminder = new Set(
    pendingReminders
      .filter((reminder) => reminder.client_id)
      .map((reminder) => String(reminder.client_id))
  );

  const lostLeads = clients
    .map((client) => {
      const lastActivity = activityByClient.get(client.id) || client.created_at || new Date().toISOString();
      const silentDays = daysBetween(lastActivity);

      return {
        id: client.id,
        name: client.name,
        phone: client.phone || null,
        daysSilent: silentDays,
        lastActivity: formatDate(lastActivity),
        reason: meetings.some((meeting) => String(meeting.client_id) === client.id)
          ? "No recent meeting follow-up"
          : "Client added but no meeting activity"
      };
    })
    .filter((client) => client.daysSilent >= 3 && !clientsWithPendingReminder.has(client.id))
    .sort((a, b) => b.daysSilent - a.daysSilent)
    .slice(0, 8);

  const nextActions = [
    overdueReminders.length > 0
      ? {
          title: "Fix overdue follow-ups",
          body: `${overdueReminders.length} follow-up action is overdue.`,
          href: "/dashboard/reminders",
          cta: "Open Reminders"
        }
      : null,
    lostLeads.length > 0
      ? {
          title: "Rescue cold leads",
          body: `${lostLeads.length} client needs a follow-up before going cold.`,
          href: "/dashboard",
          cta: "View Rescue List"
        }
      : null,
    proposals.length > 0
      ? {
          title: "Review active proposals",
          body: `${activeProposalCount} proposal needs tracking or follow-up.`,
          href: "/dashboard/proposals",
          cta: "Open Proposals"
        }
      : null,
    {
      title: "Process new meeting",
      body: "Paste meeting notes to create summary, tasks, and reminders.",
      href: "/dashboard/upload",
      cta: "Upload Meeting"
    }
  ].filter(Boolean) as { title: string; body: string; href: string; cta: string }[];

  return (
    <DashboardShell>
      <div className="page-hero command-hero">
        <div>
          <span className="badge">Daily Command Center</span>
          <h1 style={{ fontSize: 46 }}>Owner Dashboard</h1>
          <p className="muted">
            See what needs attention today: overdue follow-ups, cold leads, active proposals, and pending client work.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>{dueTodayReminders.length}</strong>
          <span>Due today</span>
        </div>
      </div>

      <section className="command-stat-grid">
        <article className="command-stat-card">
          <span>Due Today</span>
          <strong>{dueTodayReminders.length}</strong>
          <Link href="/dashboard/reminders">Open follow-ups</Link>
        </article>

        <article className="command-stat-card danger">
          <span>Overdue</span>
          <strong>{overdueReminders.length}</strong>
          <Link href="/dashboard/reminders">Fix now</Link>
        </article>

        <article className="command-stat-card">
          <span>Cold Leads</span>
          <strong>{lostLeads.length}</strong>
          <Link href="/dashboard">Rescue leads</Link>
        </article>

        <article className="command-stat-card">
          <span>Pending Tasks</span>
          <strong>{tasksCount}</strong>
          <Link href="/dashboard/tasks">View tasks</Link>
        </article>
      </section>

      <section className="owner-action-grid">
        <article className="owner-priority-card">
          <span className="badge">Next Best Actions</span>
          <h2>What should you do first?</h2>

          <div className="owner-action-list">
            {nextActions.slice(0, 4).map((action) => (
              <div key={action.title}>
                <div>
                  <strong>{action.title}</strong>
                  <p>{action.body}</p>
                </div>

                <Link href={action.href}>{action.cta}</Link>
              </div>
            ))}
          </div>
        </article>

        <article className="owner-workload-card">
          <span className="badge">Manual Work Reduced</span>
          <h2>Your autopilot workflow</h2>

          <div className="workload-steps">
            <div>
              <strong>Meeting notes</strong>
              <span>become summary and tasks</span>
            </div>
            <div>
              <strong>Follow-up actions</strong>
              <span>become reminders</span>
            </div>
            <div>
              <strong>Cold clients</strong>
              <span>become rescue alerts</span>
            </div>
            <div>
              <strong>Proposals</strong>
              <span>stay organized</span>
            </div>
          </div>
        </article>
      </section>

      <LostLeadRescuePanel leads={lostLeads} />

      <section className="command-bottom-grid">
        <article className="command-list-card">
          <div className="section-head">
            <div>
              <span className="badge">Upcoming</span>
              <h2>Next follow-ups</h2>
            </div>

            <Link className="btn secondary" href="/dashboard/reminders">
              View All
            </Link>
          </div>

          {pendingReminders.length === 0 ? (
            <div className="empty-state mini">
              <h2>No pending reminders</h2>
              <p className="muted">Create reminders from meetings or clients.</p>
            </div>
          ) : (
            <div className="command-mini-list">
              {pendingReminders.slice(0, 5).map((reminder) => (
                <article key={reminder.id}>
                  <div>
                    <strong>{reminder.title}</strong>
                    <span>
                      {reminder.client_name ? `${reminder.client_name} Â· ` : ""}
                      {formatDate(reminder.due_at)}
                    </span>
                  </div>
                  <em>{reminder.priority || "medium"}</em>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="command-list-card">
          <div className="section-head">
            <div>
              <span className="badge">Proposals</span>
              <h2>Active proposals</h2>
            </div>

            <Link className="btn secondary" href="/dashboard/proposals">
              Open
            </Link>
          </div>

          {proposals.length === 0 ? (
            <div className="empty-state mini">
              <h2>No active proposals</h2>
              <p className="muted">Create a proposal for your next client.</p>
            </div>
          ) : (
            <div className="command-mini-list">
              {proposals.map((proposal) => (
                <article key={proposal.id}>
                  <div>
                    <strong>{proposal.title}</strong>
                    <span>
                      {proposal.client_name ? `${proposal.client_name} Â· ` : ""}
                      {formatDate(proposal.updated_at)}
                    </span>
                  </div>
                  <em>{proposal.status || "draft"}</em>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </DashboardShell>
  );
}