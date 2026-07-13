import Link from "next/link";

import { DashboardShell } from "@/components/DashboardShell";
import { LostLeadRescuePanel } from "@/components/LostLeadRescuePanel";
import {
  InsightList,
  MetricCard,
  PremiumCard,
  PremiumEmptyState,
  ProgressMeter,
  SectionHeader,
  StatusBadge
} from "@/components/PremiumUI";
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
  amount?: number | null;
  updated_at?: string | null;
};

function formatDate(dateValue?: string | null) {
  if (!dateValue) return "No date";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 0
  }).format(value);
}

function daysBetween(dateValue?: string | null) {
  if (!dateValue) return 0;

  const start = new Date(dateValue).getTime();

  if (Number.isNaN(start)) return 0;

  return Math.max(
    0,
    Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24))
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getFirstName(email?: string | null) {
  if (!email) return "there";

  const rawName = email.split("@")[0] || "there";
  const firstPart = rawName.split(/[._-]/).filter(Boolean)[0];

  if (!firstPart) return "there";

  return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
}

async function safeCount(query: any) {
  const result = await query;

  if (result.error) return 0;

  return result.count || 0;
}

async function loadClients(
  supabase: any,
  userId: string
): Promise<ClientRow[]> {
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

async function loadProposals(
  supabase: any,
  userId: string
): Promise<ProposalRow[]> {
  const full = await supabase
    .from("proposals")
    .select("id,title,client_name,status,amount,updated_at")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("updated_at", { ascending: false })
    .limit(6);

  if (!full.error) {
    return (full.data || []) as ProposalRow[];
  }

  const fallback = await supabase
    .from("proposals")
    .select("id,title,client_name,status,updated_at")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("updated_at", { ascending: false })
    .limit(6);

  return (fallback.data || []).map((proposal: any) => ({
    ...proposal,
    amount: null
  })) as ProposalRow[];
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
        <PremiumEmptyState
          icon="🔐"
          title="Please sign in first"
          description="Login to open your ClientPilot AI command center."
          action={
            <Link className="cp-premium-button cp-button-gold" href="/login">
              Open Login
            </Link>
          }
        />
      </DashboardShell>
    );
  }

  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

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
      .select(
        "id,client_id,client_name,client_phone,title,status,due_at,priority,reminder_type"
      )
      .eq("user_id", user.id)
      .order("due_at", { ascending: true })
  );
  const proposals = await loadProposals(supabase, user.id);
  const tasksCount = await safeCount(
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "done")
  );

  const pendingReminders = reminders.filter((item) => item.status !== "done");
  const overdueReminders = pendingReminders.filter(
    (item) => new Date(item.due_at) < now
  );
  const dueTodayReminders = pendingReminders.filter((item) => {
    const date = new Date(item.due_at);
    return date >= todayStart && date <= todayEnd;
  });
  const meetingsThisWeek = meetings.filter((meeting) => {
    if (!meeting.created_at) return false;
    return new Date(meeting.created_at) >= weekStart;
  }).length;
  const pipelineValue = proposals.reduce(
    (total, proposal) => total + Number(proposal.amount || 0),
    0
  );
  const sentProposalCount = proposals.filter((proposal) =>
    ["sent", "approved", "accepted"].includes(
      String(proposal.status || "").toLowerCase()
    )
  ).length;
  const activeProposalCount = proposals.length;

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
      const lastActivity =
        activityByClient.get(client.id) ||
        client.created_at ||
        new Date().toISOString();
      const silentDays = daysBetween(lastActivity);

      return {
        id: client.id,
        name: client.name,
        phone: client.phone || null,
        daysSilent: silentDays,
        lastActivity: formatDate(lastActivity),
        reason: meetings.some(
          (meeting) => String(meeting.client_id) === client.id
        )
          ? "No recent meeting follow-up"
          : "Client added but no meeting activity"
      };
    })
    .filter(
      (client) =>
        client.daysSilent >= 3 &&
        !clientsWithPendingReminder.has(client.id)
    )
    .sort((a, b) => b.daysSilent - a.daysSilent)
    .slice(0, 8);

  const attentionScore = Math.max(
    18,
    Math.min(
      100,
      100 -
        overdueReminders.length * 10 -
        lostLeads.length * 5 -
        Math.max(tasksCount - 5, 0) * 2
    )
  );

  const recommendations = [
    overdueReminders.length > 0
      ? `Complete ${overdueReminders.length} overdue follow-up${
          overdueReminders.length === 1 ? "" : "s"
        } before working on new leads.`
      : "Your follow-up queue is under control.",
    lostLeads.length > 0
      ? `Reconnect with ${lostLeads[0]?.name || "your oldest inactive client"} today.`
      : "No cold leads need urgent rescue.",
    activeProposalCount > 0
      ? `Review ${activeProposalCount} active proposal${
          activeProposalCount === 1 ? "" : "s"
        } and move each one to a clear next step.`
      : "Create a proposal from your next AI meeting analysis.",
    meetingsThisWeek === 0
      ? "Record or upload your first meeting this week."
      : `You processed ${meetingsThisWeek} meeting${
          meetingsThisWeek === 1 ? "" : "s"
        } this week.`
  ];

  const risks = [
    ...(overdueReminders.length > 0
      ? [
          `${overdueReminders.length} follow-up${
            overdueReminders.length === 1 ? " is" : "s are"
          } overdue.`
        ]
      : []),
    ...(lostLeads.length > 0
      ? [
          `${lostLeads.length} client${
            lostLeads.length === 1 ? " has" : "s have"
          } been inactive for at least 3 days.`
        ]
      : []),
    ...(tasksCount > 10 ? ["The open task queue is becoming heavy."] : [])
  ];

  const firstName = getFirstName(user.email);

  return (
    <DashboardShell>
      <div className="cp-page">
        <section className="cp-dashboard-hero">
          <div className="cp-dashboard-hero-copy">
            <span className="cp-eyebrow">AI Command Center</span>
            <h1>
              {getGreeting()}, {firstName} 👋
            </h1>
            <p>
              ClientPilot has organized your follow-ups, proposals, meetings,
              tasks, and cold leads into one clear plan for today.
            </p>
            <div className="cp-hero-actions">
              <Link
                className="cp-premium-button cp-button-gold"
                href="/dashboard/upload"
              >
                🎙 Process Meeting
              </Link>
              <Link
                className="cp-premium-button cp-button-soft"
                href="/dashboard/reminders"
              >
                View Today&apos;s Work
              </Link>
            </div>
          </div>

          <div className="cp-dashboard-health">
            <div className="cp-health-orb">
              <strong>{attentionScore}</strong>
              <span>/100</span>
            </div>
            <div>
              <StatusBadge
                tone={
                  attentionScore >= 80
                    ? "green"
                    : attentionScore >= 55
                      ? "gold"
                      : "red"
                }
              >
                {attentionScore >= 80
                  ? "Workspace healthy"
                  : attentionScore >= 55
                    ? "Needs attention"
                    : "Action required"}
              </StatusBadge>
              <h3>Sales Health</h3>
              <p>
                Based on overdue actions, cold clients, and your open workload.
              </p>
            </div>
          </div>
        </section>

        <section className="cp-metric-grid">
          <MetricCard
            icon="💰"
            label="Pipeline Value"
            value={`AED ${formatMoney(pipelineValue)}`}
            note={
              pipelineValue > 0
                ? `${activeProposalCount} active proposals`
                : "Add amounts to proposals"
            }
            tone="gold"
          />
          <MetricCard
            icon="🔥"
            label="Cold Leads"
            value={lostLeads.length}
            note="Need a rescue follow-up"
            tone={lostLeads.length > 0 ? "red" : "green"}
          />
          <MetricCard
            icon="🎙"
            label="Meetings This Week"
            value={meetingsThisWeek}
            note={`${meetings.length} total meetings`}
            tone="blue"
          />
          <MetricCard
            icon="📄"
            label="Active Proposals"
            value={activeProposalCount}
            note={`${sentProposalCount} sent or accepted`}
            tone="green"
          />
        </section>

        <div className="cp-dashboard-main-grid">
          <PremiumCard padding="large" glow>
            <SectionHeader
              eyebrow="AI Priority Plan"
              title="What needs your attention?"
              description="A simple order of work so you can move deals forward without feeling overwhelmed."
              action={
                <Link
                  className="cp-premium-button cp-button-dark"
                  href="/dashboard/tasks"
                >
                  Open Tasks
                </Link>
              }
            />

            <div className="cp-priority-stack">
              <Link
                href="/dashboard/reminders"
                className="cp-priority-row cp-priority-danger"
              >
                <div className="cp-priority-icon">⏰</div>
                <div>
                  <strong>Fix overdue follow-ups</strong>
                  <p>
                    {overdueReminders.length > 0
                      ? `${overdueReminders.length} action${
                          overdueReminders.length === 1 ? " is" : "s are"
                        } already overdue.`
                      : "Nothing is overdue right now."}
                  </p>
                </div>
                <span>Open</span>
              </Link>

              <Link href="/dashboard/reminders" className="cp-priority-row">
                <div className="cp-priority-icon">📅</div>
                <div>
                  <strong>Complete today&apos;s actions</strong>
                  <p>
                    {dueTodayReminders.length} reminder
                    {dueTodayReminders.length === 1 ? "" : "s"} due today.
                  </p>
                </div>
                <span>View</span>
              </Link>

              <Link href="/dashboard/proposals" className="cp-priority-row">
                <div className="cp-priority-icon">📄</div>
                <div>
                  <strong>Review active proposals</strong>
                  <p>
                    {activeProposalCount} proposal
                    {activeProposalCount === 1 ? "" : "s"} currently need
                    tracking.
                  </p>
                </div>
                <span>Review</span>
              </Link>

              <Link
                href="/dashboard/upload"
                className="cp-priority-row cp-priority-gold"
              >
                <div className="cp-priority-icon">🤖</div>
                <div>
                  <strong>Process your next meeting</strong>
                  <p>
                    Create a transcript, summary, tasks, sales insights, and a
                    proposal draft.
                  </p>
                </div>
                <span>Start</span>
              </Link>
            </div>
          </PremiumCard>

          <PremiumCard padding="large">
            <SectionHeader
              eyebrow="AI Sales Coach"
              title="Workspace health"
              description="A quick view of how organized your current sales activity is."
            />
            <div className="cp-stack">
              <ProgressMeter
                value={attentionScore}
                label="Overall sales health"
                helper={
                  attentionScore >= 80
                    ? "Excellent — keep the current rhythm."
                    : "Complete overdue work to improve this score."
                }
              />

              <div className="cp-mini-health-grid">
                <div>
                  <span>Due today</span>
                  <strong>{dueTodayReminders.length}</strong>
                </div>
                <div>
                  <span>Overdue</span>
                  <strong>{overdueReminders.length}</strong>
                </div>
                <div>
                  <span>Open tasks</span>
                  <strong>{tasksCount}</strong>
                </div>
                <div>
                  <span>Clients</span>
                  <strong>{clients.length}</strong>
                </div>
              </div>

              <div className="cp-ai-note">
                <span>🤖</span>
                <div>
                  <strong>ClientPilot recommendation</strong>
                  <p>{recommendations[0]}</p>
                </div>
              </div>
            </div>
          </PremiumCard>
        </div>

        <div className="cp-grid-two">
          <InsightList
            title="AI Recommendations"
            items={recommendations}
            tone="positive"
          />
          <InsightList
            title="Risks to Watch"
            items={risks}
            tone={risks.length > 0 ? "danger" : "positive"}
            emptyText="No urgent risks detected."
          />
        </div>

        <LostLeadRescuePanel leads={lostLeads} />

        <div className="cp-dashboard-bottom-grid">
          <PremiumCard padding="large">
            <SectionHeader
              eyebrow="Upcoming"
              title="Next follow-ups"
              description="The next client actions already waiting in your workspace."
              action={
                <Link
                  className="cp-premium-button cp-button-soft"
                  href="/dashboard/reminders"
                >
                  View All
                </Link>
              }
            />

            {pendingReminders.length === 0 ? (
              <PremiumEmptyState
                icon="✅"
                title="No pending reminders"
                description="Your follow-up queue is clear. Create a reminder from a meeting or client."
                action={
                  <Link
                    className="cp-premium-button cp-button-gold"
                    href="/dashboard/upload"
                  >
                    Process Meeting
                  </Link>
                }
              />
            ) : (
              <div className="cp-activity-list">
                {pendingReminders.slice(0, 5).map((reminder) => (
                  <article key={reminder.id}>
                    <div className="cp-activity-marker">
                      {new Date(reminder.due_at) < now ? "!" : "•"}
                    </div>
                    <div>
                      <strong>{reminder.title}</strong>
                      <p>
                        {reminder.client_name
                          ? `${reminder.client_name} · `
                          : ""}
                        {formatDate(reminder.due_at)}
                      </p>
                    </div>
                    <StatusBadge
                      tone={
                        new Date(reminder.due_at) < now
                          ? "red"
                          : reminder.priority === "high"
                            ? "gold"
                            : "gray"
                      }
                    >
                      {reminder.priority || "medium"}
                    </StatusBadge>
                  </article>
                ))}
              </div>
            )}
          </PremiumCard>

          <PremiumCard padding="large">
            <SectionHeader
              eyebrow="Proposal Activity"
              title="Active proposals"
              description="Keep every opportunity moving toward a clear decision."
              action={
                <Link
                  className="cp-premium-button cp-button-soft"
                  href="/dashboard/proposals"
                >
                  Open Library
                </Link>
              }
            />

            {proposals.length === 0 ? (
              <PremiumEmptyState
                icon="📄"
                title="No active proposals"
                description="Process a meeting, then turn the AI analysis into a polished client proposal."
                action={
                  <Link
                    className="cp-premium-button cp-button-gold"
                    href="/dashboard/upload"
                  >
                    Upload Meeting
                  </Link>
                }
              />
            ) : (
              <div className="cp-activity-list">
                {proposals.map((proposal) => (
                  <article key={proposal.id}>
                    <div className="cp-activity-marker cp-marker-gold">📄</div>
                    <div>
                      <strong>{proposal.title}</strong>
                      <p>
                        {proposal.client_name
                          ? `${proposal.client_name} · `
                          : ""}
                        {formatDate(proposal.updated_at)}
                      </p>
                    </div>
                    <StatusBadge
                      tone={
                        ["accepted", "approved"].includes(
                          String(proposal.status || "").toLowerCase()
                        )
                          ? "green"
                          : proposal.status === "sent"
                            ? "blue"
                            : "gold"
                      }
                    >
                      {proposal.status || "draft"}
                    </StatusBadge>
                  </article>
                ))}
              </div>
            )}
          </PremiumCard>
        </div>
      </div>
    </DashboardShell>
  );
}
