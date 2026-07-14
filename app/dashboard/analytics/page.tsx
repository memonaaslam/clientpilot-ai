import Link from "next/link";

import { DashboardShell } from "@/components/DashboardShell";
import {
  PremiumEmptyState,
  ProgressMeter,
  StatusBadge
} from "@/components/PremiumUI";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type ClientRow = {
  id: string;
  name: string;
  stage?: string | null;
  created_at?: string | null;
};

type MeetingRow = {
  id: string;
  created_at?: string | null;
};

type TaskRow = {
  id: string;
  status?: string | null;
  due_at?: string | null;
  due_date?: string | null;
  created_at?: string | null;
};

type ReminderRow = {
  id: string;
  status?: string | null;
  due_at?: string | null;
  created_at?: string | null;
};

type ProposalRow = {
  id: string;
  title?: string | null;
  status?: string | null;
  amount?: number | null;
  client_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  date: string | null;
  status?: string | null;
};

function formatMoney(value: number) {
  return `AED ${new Intl.NumberFormat("en", {
    maximumFractionDigits: 0
  }).format(value)}`;
}

function formatDate(value?: string | null) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short"
  }).format(date);
}

function getTaskDueDate(task: TaskRow) {
  return task.due_at || task.due_date || null;
}

function safePercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function safeRows<T>(query: any): Promise<T[]> {
  const result = await query;

  if (result.error) {
    return [];
  }

  return (result.data || []) as T[];
}

async function loadTasks(
  supabase: any,
  userId: string
): Promise<TaskRow[]> {
  const modern = await supabase
    .from("tasks")
    .select("id,status,due_at,due_date,created_at")
    .eq("user_id", userId);

  if (!modern.error) {
    return (modern.data || []) as TaskRow[];
  }

  const fallback = await supabase
    .from("tasks")
    .select("id,status,due_at,created_at")
    .eq("user_id", userId);

  if (!fallback.error) {
    return (fallback.data || []) as TaskRow[];
  }

  const legacy = await supabase
    .from("tasks")
    .select("id,status,due_date,created_at")
    .eq("user_id", userId);

  return (legacy.data || []) as TaskRow[];
}

function stageLabel(stage?: string | null) {
  const labels: Record<string, string> = {
    new_lead: "New Lead",
    meeting_done: "Meeting Done",
    proposal_sent: "Proposal Sent",
    follow_up: "Follow-Up",
    won: "Won",
    lost: "Lost"
  };

  return labels[stage || "new_lead"] || stage || "New Lead";
}

export default async function AnalyticsPage() {
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
          description="Login to open your ClientPilot analytics center."
          action={
            <Link
              className="cp-premium-button cp-button-gold"
              href="/login"
            >
              Open Login
            </Link>
          }
        />
      </DashboardShell>
    );
  }

  const [
    clients,
    meetings,
    reminders,
    proposals,
    tasks
  ] = await Promise.all([
    safeRows<ClientRow>(
      supabase
        .from("clients")
        .select("id,name,stage,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    ),
    safeRows<MeetingRow>(
      supabase
        .from("meetings")
        .select("id,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    ),
    safeRows<ReminderRow>(
      supabase
        .from("reminders")
        .select("id,status,due_at,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    ),
    safeRows<ProposalRow>(
      supabase
        .from("proposals")
        .select(
          "id,title,status,amount,client_name,created_at,updated_at"
        )
        .eq("user_id", user.id)
        .eq("deleted", false)
        .order("updated_at", { ascending: false })
    ),
    loadTasks(supabase, user.id)
  ]);

  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const meetingsThisMonth = meetings.filter(
    (meeting) =>
      meeting.created_at &&
      new Date(meeting.created_at) >= monthStart
  ).length;

  const openTasks = tasks.filter(
    (task) => task.status !== "done"
  );

  const doneTasks = tasks.filter(
    (task) => task.status === "done"
  );

  const overdueTasks = openTasks.filter((task) => {
    const due = getTaskDueDate(task);
    return due ? new Date(due) < now : false;
  });

  const pendingReminders = reminders.filter(
    (reminder) => reminder.status !== "done"
  );

  const overdueReminders = pendingReminders.filter(
    (reminder) =>
      reminder.due_at
        ? new Date(reminder.due_at) < now
        : false
  );

  const totalProposalValue = proposals.reduce(
    (sum, proposal) =>
      sum + Number(proposal.amount || 0),
    0
  );

  const acceptedProposals = proposals.filter(
    (proposal) =>
      proposal.status === "accepted" ||
      proposal.status === "approved"
  );

  const acceptanceRate = proposals.length
    ? safePercent(
        (acceptedProposals.length /
          proposals.length) *
          100
      )
    : 0;

  const wonClients = clients.filter(
    (client) => client.stage === "won"
  ).length;

  const lostClients = clients.filter(
    (client) => client.stage === "lost"
  ).length;

  const closedDeals = wonClients + lostClients;

  const winRate = closedDeals
    ? safePercent(
        (wonClients / closedDeals) * 100
      )
    : 0;

  const taskCompletionRate = tasks.length
    ? safePercent(
        (doneTasks.length / tasks.length) *
          100
      )
    : 0;

  const pipelineStages = [
    "new_lead",
    "meeting_done",
    "proposal_sent",
    "follow_up",
    "won",
    "lost"
  ].map((stage) => ({
    key: stage,
    label: stageLabel(stage),
    count: clients.filter(
      (client) =>
        (client.stage || "new_lead") === stage
    ).length
  }));

  const maxStageCount = Math.max(
    1,
    ...pipelineStages.map((item) => item.count)
  );

  const lastSixMonths = Array.from(
    { length: 6 },
    (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (5 - index),
        1
      );

      const key = monthKey(date);

      return {
        key,
        label: monthLabel(date),
        meetings: meetings.filter(
          (meeting) =>
            meeting.created_at &&
            monthKey(
              new Date(meeting.created_at)
            ) === key
        ).length,
        proposals: proposals.filter(
          (proposal) => {
            const value =
              proposal.created_at ||
              proposal.updated_at;

            return (
              value &&
              monthKey(new Date(value)) === key
            );
          }
        ).length,
        clients: clients.filter(
          (client) =>
            client.created_at &&
            monthKey(
              new Date(client.created_at)
            ) === key
        ).length
      };
    }
  );

  const maxMonthlyActivity = Math.max(
    1,
    ...lastSixMonths.map(
      (item) =>
        item.meetings +
        item.proposals +
        item.clients
    )
  );

  const activity: ActivityItem[] = [
    ...clients.slice(0, 4).map((client) => ({
      id: `client-${client.id}`,
      type: "Client",
      title: client.name,
      date: client.created_at || null,
      status: client.stage || null
    })),
    ...proposals.slice(0, 4).map((proposal) => ({
      id: `proposal-${proposal.id}`,
      type: "Proposal",
      title: proposal.title || "Proposal",
      date:
        proposal.updated_at ||
        proposal.created_at ||
        null,
      status: proposal.status || null
    })),
    ...meetings.slice(0, 4).map((meeting) => ({
      id: `meeting-${meeting.id}`,
      type: "Meeting",
      title: "Meeting processed",
      date: meeting.created_at || null
    }))
  ]
    .sort(
      (a, b) =>
        new Date(b.date || 0).getTime() -
        new Date(a.date || 0).getTime()
    )
    .slice(0, 8);

  const recommendations = [
    overdueTasks.length > 0
      ? `Complete ${overdueTasks.length} overdue task${
          overdueTasks.length === 1 ? "" : "s"
        } first.`
      : "Your task queue has no overdue items.",
    overdueReminders.length > 0
      ? `${overdueReminders.length} reminder${
          overdueReminders.length === 1 ? " is" : "s are"
        } overdue.`
      : "Your reminder follow-ups are under control.",
    acceptanceRate < 40 && proposals.length > 0
      ? "Review proposal quality and follow-up timing to improve acceptance."
      : "Proposal acceptance is currently healthy.",
    winRate < 50 && closedDeals > 0
      ? "Review lost deals for repeated objections or pricing concerns."
      : "Closed-deal performance is stable."
  ];

  return (
    <DashboardShell>
      <div className="cp-page">
        <section className="cp-analytics-hero">
          <div>
            <span className="cp-eyebrow">
              Business Intelligence
            </span>

            <h1>Analytics</h1>

            <p>
              Understand clients, meetings, tasks,
              reminders, proposals, pipeline movement,
              and sales performance from one clear
              executive view.
            </p>

            <div className="cp-analytics-hero-actions">
              <Link
                className="cp-premium-button cp-button-gold"
                href="/dashboard/pipeline"
              >
                Open Pipeline
              </Link>

              <Link
                className="cp-premium-button cp-button-soft"
                href="/dashboard/proposals"
              >
                Open Proposals
              </Link>
            </div>
          </div>

          <div className="cp-analytics-score-card">
            <span>Overall Sales Health</span>

            <strong>
              {safePercent(
                (taskCompletionRate +
                  acceptanceRate +
                  winRate) /
                  3
              )}
            </strong>

            <small>/100</small>
          </div>
        </section>

        <section className="cp-analytics-kpi-grid">
          <article>
            <span>Total Clients</span>
            <strong>{clients.length}</strong>
            <small>{wonClients} won</small>
          </article>

          <article>
            <span>Meetings This Month</span>
            <strong>{meetingsThisMonth}</strong>
            <small>{meetings.length} total</small>
          </article>

          <article>
            <span>Open Tasks</span>
            <strong>{openTasks.length}</strong>
            <small>{overdueTasks.length} overdue</small>
          </article>

          <article>
            <span>Proposal Value</span>
            <strong>
              {formatMoney(totalProposalValue)}
            </strong>
            <small>{proposals.length} active</small>
          </article>
        </section>

        <div className="cp-analytics-main-grid">
          <section className="cp-analytics-panel">
            <div className="cp-analytics-panel-head">
              <div>
                <span className="cp-eyebrow">
                  Monthly Activity
                </span>
                <h2>Last six months</h2>
                <p>
                  Clients, meetings, and proposals
                  created each month.
                </p>
              </div>
            </div>

            <div className="cp-monthly-chart">
              {lastSixMonths.map((item) => {
                const total =
                  item.clients +
                  item.meetings +
                  item.proposals;

                return (
                  <div
                    className="cp-monthly-chart-column"
                    key={item.key}
                  >
                    <div className="cp-monthly-bars">
                      <span
                        title={`${item.clients} clients`}
                        style={{
                          height: `${
                            (item.clients /
                              maxMonthlyActivity) *
                            100
                          }%`
                        }}
                      />

                      <span
                        title={`${item.meetings} meetings`}
                        style={{
                          height: `${
                            (item.meetings /
                              maxMonthlyActivity) *
                            100
                          }%`
                        }}
                      />

                      <span
                        title={`${item.proposals} proposals`}
                        style={{
                          height: `${
                            (item.proposals /
                              maxMonthlyActivity) *
                            100
                          }%`
                        }}
                      />
                    </div>

                    <strong>{item.label}</strong>
                    <small>{total} activities</small>
                  </div>
                );
              })}
            </div>

            <div className="cp-analytics-legend">
              <span>
                <i className="cp-legend-client" />
                Clients
              </span>

              <span>
                <i className="cp-legend-meeting" />
                Meetings
              </span>

              <span>
                <i className="cp-legend-proposal" />
                Proposals
              </span>
            </div>
          </section>

          <section className="cp-analytics-panel">
            <div className="cp-analytics-panel-head">
              <div>
                <span className="cp-eyebrow">
                  Performance
                </span>
                <h2>Conversion health</h2>
                <p>
                  Current completion, acceptance,
                  and deal-win performance.
                </p>
              </div>
            </div>

            <div className="cp-analytics-progress-stack">
              <ProgressMeter
                value={taskCompletionRate}
                label="Task Completion"
                helper={`${doneTasks.length} of ${tasks.length} tasks completed`}
              />

              <ProgressMeter
                value={acceptanceRate}
                label="Proposal Acceptance"
                helper={`${acceptedProposals.length} of ${proposals.length} proposals accepted or approved`}
              />

              <ProgressMeter
                value={winRate}
                label="Closed Deal Win Rate"
                helper={`${wonClients} won and ${lostClients} lost`}
              />
            </div>
          </section>
        </div>

        <div className="cp-analytics-main-grid">
          <section className="cp-analytics-panel">
            <div className="cp-analytics-panel-head">
              <div>
                <span className="cp-eyebrow">
                  Pipeline Distribution
                </span>
                <h2>Clients by stage</h2>
                <p>
                  See where opportunities are
                  accumulating.
                </p>
              </div>
            </div>

            <div className="cp-pipeline-analytics-list">
              {pipelineStages.map((stage) => (
                <div key={stage.key}>
                  <div>
                    <span>{stage.label}</span>
                    <strong>{stage.count}</strong>
                  </div>

                  <div className="cp-pipeline-analytics-track">
                    <i
                      style={{
                        width: `${
                          (stage.count /
                            maxStageCount) *
                          100
                        }%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="cp-analytics-panel cp-analytics-ai-panel">
            <span className="cp-eyebrow">
              AI Recommendations
            </span>

            <h2>What to improve next</h2>

            <div className="cp-analytics-recommendations">
              {recommendations.map((item, index) => (
                <article key={item}>
                  <span>{index + 1}</span>
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="cp-analytics-main-grid">
          <section className="cp-analytics-panel">
            <div className="cp-analytics-panel-head">
              <div>
                <span className="cp-eyebrow">
                  Follow-Up Health
                </span>
                <h2>Tasks and reminders</h2>
              </div>
            </div>

            <div className="cp-analytics-mini-grid">
              <article>
                <span>Pending Reminders</span>
                <strong>
                  {pendingReminders.length}
                </strong>
              </article>

              <article>
                <span>Overdue Reminders</span>
                <strong>
                  {overdueReminders.length}
                </strong>
              </article>

              <article>
                <span>Completed Tasks</span>
                <strong>{doneTasks.length}</strong>
              </article>

              <article>
                <span>Overdue Tasks</span>
                <strong>
                  {overdueTasks.length}
                </strong>
              </article>
            </div>
          </section>

          <section className="cp-analytics-panel">
            <div className="cp-analytics-panel-head">
              <div>
                <span className="cp-eyebrow">
                  Recent Activity
                </span>
                <h2>Latest movement</h2>
              </div>
            </div>

            {activity.length === 0 ? (
              <PremiumEmptyState
                icon="🕘"
                title="No recent activity"
                description="New clients, meetings, and proposals will appear here."
              />
            ) : (
              <div className="cp-analytics-activity-list">
                {activity.map((item) => (
                  <article key={item.id}>
                    <div className="cp-analytics-activity-icon">
                      {item.type.slice(0, 1)}
                    </div>

                    <div>
                      <span>{item.type}</span>
                      <strong>{item.title}</strong>
                      <small>{formatDate(item.date)}</small>
                    </div>

                    {item.status ? (
                      <StatusBadge tone="gray">
                        {stageLabel(item.status)}
                      </StatusBadge>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
