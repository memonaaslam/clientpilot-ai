import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/DashboardShell";
import {
  PremiumCard,
  PremiumEmptyState,
  SectionHeader,
  StatusBadge
} from "@/components/PremiumUI";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ClientRecord = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  address?: string | null;
  notes?: string | null;
  stage: string | null;
  created_at: string;
};

type MeetingRow = {
  id: string;
  title: string | null;
  summary: string | null;
  created_at: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  status: string | null;
  due_at: string | null;
  priority?: string | null;
};

type ReminderRow = {
  id: string;
  title: string;
  status: string | null;
  due_at: string | null;
};

type ProposalRow = {
  id: string;
  title: string;
  status: string | null;
  amount?: number | null;
  created_at: string | null;
};

function stageLabel(stage: string | null) {
  const value = stage || "new_lead";

  const labels: Record<string, string> = {
    new_lead: "New Lead",
    meeting_done: "Meeting Done",
    proposal_sent: "Proposal Sent",
    follow_up: "Follow-Up",
    won: "Won",
    lost: "Lost"
  };

  return labels[value] || value;
}

function stageTone(
  stage: string | null
): "gold" | "green" | "blue" | "red" | "gray" {
  switch (stage) {
    case "won":
      return "green";
    case "proposal_sent":
      return "blue";
    case "lost":
      return "red";
    case "meeting_done":
    case "follow_up":
      return "gold";
    default:
      return "gray";
  }
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

function formatMoney(value?: number | null) {
  if (!value) return "Not set";

  return `AED ${new Intl.NumberFormat("en", {
    maximumFractionDigits: 0
  }).format(value)}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

async function safeRows<T>(query: any): Promise<T[]> {
  const result = await query;

  if (result.error) {
    return [];
  }

  return (result.data || []) as T[];
}

export default async function ClientProfilePage({
  params
}: PageProps) {
  const { id } = await params;

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
          description="Login to open this client profile."
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

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id,name,phone,email,company,address,notes,stage,created_at"
    )
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();

  if (!client) {
    notFound();
  }

  const clientRecord = client as ClientRecord;

  const [
    meetings,
    tasks,
    reminders,
    proposals
  ] = await Promise.all([
    safeRows<MeetingRow>(
      supabase
        .from("meetings")
        .select("id,title,summary,created_at")
        .eq("user_id", user.id)
        .eq("client_id", id)
        .order("created_at", {
          ascending: false
        })
        .limit(5)
    ),
    safeRows<TaskRow>(
      supabase
        .from("tasks")
        .select("id,title,status,due_at,priority")
        .eq("user_id", user.id)
        .eq("client_id", id)
        .order("due_at", {
          ascending: true
        })
        .limit(6)
    ),
    safeRows<ReminderRow>(
      supabase
        .from("reminders")
        .select("id,title,status,due_at")
        .eq("user_id", user.id)
        .eq("client_id", id)
        .order("due_at", {
          ascending: true
        })
        .limit(6)
    ),
    safeRows<ProposalRow>(
      supabase
        .from("proposals")
        .select("id,title,status,amount,created_at")
        .eq("user_id", user.id)
        .eq("client_id", id)
        .eq("deleted", false)
        .order("created_at", {
          ascending: false
        })
        .limit(5)
    )
  ]);

  const openTasks = tasks.filter(
    (task) => task.status !== "done"
  );

  const pendingReminders = reminders.filter(
    (reminder) => reminder.status !== "done"
  );

  const activeProposals = proposals.filter(
    (proposal) =>
      !["accepted", "approved", "lost"].includes(
        String(proposal.status || "").toLowerCase()
      )
  );

  const nextBestAction =
    openTasks[0]?.title ||
    pendingReminders[0]?.title ||
    (activeProposals.length > 0
      ? "Follow up on the active proposal."
      : meetings.length === 0
        ? "Upload or record the first meeting."
        : "Create the next follow-up action.");

  const activity = [
    ...meetings.map((item) => ({
      id: `meeting-${item.id}`,
      type: "Meeting",
      title: item.title || "Client meeting",
      date: item.created_at,
      status: null
    })),
    ...tasks.map((item) => ({
      id: `task-${item.id}`,
      type: "Task",
      title: item.title,
      date: item.due_at,
      status: item.status
    })),
    ...reminders.map((item) => ({
      id: `reminder-${item.id}`,
      type: "Reminder",
      title: item.title,
      date: item.due_at,
      status: item.status
    })),
    ...proposals.map((item) => ({
      id: `proposal-${item.id}`,
      type: "Proposal",
      title: item.title,
      date: item.created_at,
      status: item.status
    }))
  ]
    .sort(
      (a, b) =>
        new Date(b.date || 0).getTime() -
        new Date(a.date || 0).getTime()
    )
    .slice(0, 10);

  return (
    <DashboardShell>
      <div className="cp-page">
        <section className="cp-client-profile-hero">
          <div className="cp-profile-avatar">
            {initials(clientRecord.name) || "CL"}
          </div>

          <div className="cp-profile-hero-copy">
            <div className="cp-profile-title-row">
              <div>
                <span className="cp-eyebrow">
                  Client Profile
                </span>

                <h1>{clientRecord.name}</h1>

                <p>
                  {clientRecord.company || "No company added"}
                </p>
              </div>

              <StatusBadge tone={stageTone(clientRecord.stage)}>
                {stageLabel(clientRecord.stage)}
              </StatusBadge>
            </div>

            <div className="cp-profile-contact-strip">
              <span>📞 {clientRecord.phone || "No phone"}</span>
              <span>✉ {clientRecord.email || "No email"}</span>
              <span>📍 {clientRecord.address || "No address"}</span>
            </div>
          </div>

          <div className="cp-profile-hero-actions">
            <Link
              className="cp-premium-button cp-button-gold"
              href={`/dashboard/upload?client_id=${clientRecord.id}`}
            >
              Process Meeting
            </Link>

            <Link
              className="cp-premium-button cp-button-soft"
              href="/dashboard/clients"
            >
              Back to Clients
            </Link>
          </div>
        </section>

        <section className="cp-profile-metric-grid">
          <article>
            <span>Meetings</span>
            <strong>{meetings.length}</strong>
          </article>

          <article>
            <span>Open Tasks</span>
            <strong>{openTasks.length}</strong>
          </article>

          <article>
            <span>Pending Reminders</span>
            <strong>{pendingReminders.length}</strong>
          </article>

          <article>
            <span>Active Proposals</span>
            <strong>{activeProposals.length}</strong>
          </article>
        </section>

        <div className="cp-client-profile-grid">
          <PremiumCard padding="large">
            <SectionHeader
              eyebrow="AI Next Step"
              title="What should happen next?"
              description="The most useful next action based on this client’s current activity."
            />

            <div className="cp-client-next-action">
              <span>✦</span>
              <div>
                <strong>{nextBestAction}</strong>
                <p>
                  Keep the client moving with one clear action instead of searching through every page.
                </p>
              </div>
            </div>

            <div className="cp-profile-action-buttons">
              <Link
                className="cp-premium-button cp-button-dark"
                href="/dashboard/tasks"
              >
                Open Tasks
              </Link>

              <Link
                className="cp-premium-button cp-button-soft"
                href="/dashboard/reminders"
              >
                Open Reminders
              </Link>

              <Link
                className="cp-premium-button cp-button-soft"
                href="/dashboard/proposals"
              >
                Open Proposals
              </Link>
            </div>
          </PremiumCard>

          <PremiumCard padding="large">
            <SectionHeader
              eyebrow="Client Notes"
              title="Context"
              description="The saved information that helps you understand the relationship quickly."
            />

            <div className="cp-client-context">
              <div>
                <span>Company</span>
                <strong>{clientRecord.company || "Not added"}</strong>
              </div>

              <div>
                <span>Stage</span>
                <strong>{stageLabel(clientRecord.stage)}</strong>
              </div>

              <div>
                <span>Added</span>
                <strong>{formatDate(clientRecord.created_at)}</strong>
              </div>
            </div>

            <div className="cp-client-notes-box">
              {clientRecord.notes || "No client notes have been added yet."}
            </div>
          </PremiumCard>
        </div>

        <div className="cp-client-profile-grid">
          <PremiumCard padding="large">
            <SectionHeader
              eyebrow="Recent Meetings"
              title="Meeting history"
              description="The latest conversations and AI summaries linked to this client."
              action={
                <Link
                  className="cp-premium-button cp-button-soft"
                  href="/dashboard/meetings"
                >
                  View All
                </Link>
              }
            />

            {meetings.length === 0 ? (
              <PremiumEmptyState
                icon="🎙"
                title="No meetings yet"
                description="Record, upload, or paste the first meeting to start building this client’s AI memory."
                action={
                  <Link
                    className="cp-premium-button cp-button-gold"
                    href={`/dashboard/upload?client_id=${clientRecord.id}`}
                  >
                    Process Meeting
                  </Link>
                }
              />
            ) : (
              <div className="cp-profile-list">
                {meetings.map((meeting) => (
                  <article key={meeting.id}>
                    <div>
                      <strong>
                        {meeting.title || "Client meeting"}
                      </strong>
                      <p>
                        {meeting.summary ||
                          "Meeting saved without a summary."}
                      </p>
                    </div>

                    <small>
                      {formatDate(meeting.created_at)}
                    </small>
                  </article>
                ))}
              </div>
            )}
          </PremiumCard>

          <PremiumCard padding="large">
            <SectionHeader
              eyebrow="Proposals"
              title="Commercial activity"
              description="Track proposal status and value without leaving the client profile."
            />

            {proposals.length === 0 ? (
              <PremiumEmptyState
                icon="📄"
                title="No proposals yet"
                description="Create a proposal from the client’s meeting analysis when the opportunity is ready."
              />
            ) : (
              <div className="cp-profile-list">
                {proposals.map((proposal) => (
                  <article key={proposal.id}>
                    <div>
                      <strong>{proposal.title}</strong>
                      <p>
                        {formatMoney(proposal.amount)}
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

        <PremiumCard padding="large">
          <SectionHeader
            eyebrow="Activity Timeline"
            title="Everything in one place"
            description="Meetings, tasks, reminders, and proposals ordered by activity."
          />

          {activity.length === 0 ? (
            <PremiumEmptyState
              icon="🕘"
              title="No activity yet"
              description="Add a meeting, task, reminder, or proposal to begin this client timeline."
            />
          ) : (
            <div className="cp-client-activity-timeline">
              {activity.map((event) => (
                <article key={event.id}>
                  <div className="cp-client-activity-dot">
                    {event.type.slice(0, 1)}
                  </div>

                  <div>
                    <span>{event.type}</span>
                    <strong>{event.title}</strong>
                    <small>{formatDate(event.date)}</small>
                  </div>

                  {event.status ? (
                    <StatusBadge tone="gray">
                      {event.status}
                    </StatusBadge>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </PremiumCard>
      </div>
    </DashboardShell>
  );
}
