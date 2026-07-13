import Link from "next/link";
import { revalidatePath } from "next/cache";

import { DashboardShell } from "@/components/DashboardShell";
import {
  PremiumEmptyState,
  StatusBadge
} from "@/components/PremiumUI";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ClientRecord = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  stage: string | null;
  created_at: string;
};

const stages = [
  {
    key: "new_lead",
    label: "New Lead",
    helper: "Fresh opportunities",
    tone: "gray" as const,
    icon: "✦"
  },
  {
    key: "meeting_done",
    label: "Meeting Done",
    helper: "Conversation completed",
    tone: "blue" as const,
    icon: "🎙"
  },
  {
    key: "proposal_sent",
    label: "Proposal Sent",
    helper: "Waiting for review",
    tone: "gold" as const,
    icon: "📄"
  },
  {
    key: "follow_up",
    label: "Follow-Up",
    helper: "Needs attention",
    tone: "gold" as const,
    icon: "↗"
  },
  {
    key: "won",
    label: "Won",
    helper: "Closed successfully",
    tone: "green" as const,
    icon: "✓"
  },
  {
    key: "lost",
    label: "Lost",
    helper: "Closed without sale",
    tone: "red" as const,
    icon: "×"
  }
];

async function updateClientStage(formData: FormData) {
  "use server";

  const clientId = String(
    formData.get("clientId") || ""
  ).trim();

  const stage = String(
    formData.get("stage") || "new_lead"
  ).trim();

  const allowedStages = new Set(
    stages.map((item) => item.key)
  );

  if (!clientId || !allowedStages.has(stage)) {
    return;
  }

  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("clients")
    .update({ stage })
    .eq("id", clientId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/clients");
  revalidatePath(
    `/dashboard/clients/${clientId}`
  );
  revalidatePath("/dashboard");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium"
  }).format(date);
}

export default async function PipelinePage() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data } = user
    ? await supabase
        .from("clients")
        .select(
          "id,name,phone,email,company,stage,created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false
        })
    : { data: [] };

  const clients =
    (data || []) as ClientRecord[];

  const wonCount = clients.filter(
    (client) => client.stage === "won"
  ).length;

  const proposalCount = clients.filter(
    (client) =>
      client.stage === "proposal_sent"
  ).length;

  const followUpCount = clients.filter(
    (client) =>
      client.stage === "follow_up"
  ).length;

  return (
    <DashboardShell>
      <div className="cp-page">
        <section className="cp-pipeline-hero">
          <div>
            <span className="cp-eyebrow">
              Sales CRM
            </span>

            <h1>Pipeline</h1>

            <p>
              Move each client through a clear sales
              journey from new lead to won or lost.
            </p>

            <div className="cp-pipeline-hero-actions">
              <Link
                className="cp-premium-button cp-button-gold"
                href="/dashboard/clients"
              >
                Add Client
              </Link>

              <Link
                className="cp-premium-button cp-button-soft"
                href="/dashboard/upload"
              >
                Process Meeting
              </Link>
            </div>
          </div>

          <div className="cp-pipeline-summary">
            <div>
              <span>Total Clients</span>
              <strong>{clients.length}</strong>
            </div>

            <div>
              <span>Proposal Stage</span>
              <strong>{proposalCount}</strong>
            </div>

            <div>
              <span>Follow-Up</span>
              <strong>{followUpCount}</strong>
            </div>

            <div>
              <span>Won</span>
              <strong>{wonCount}</strong>
            </div>
          </div>
        </section>

        {!user ? (
          <PremiumEmptyState
            icon="🔐"
            title="Please sign in first"
            description="Login to manage your ClientPilot sales pipeline."
            action={
              <Link
                className="cp-premium-button cp-button-gold"
                href="/login"
              >
                Open Login
              </Link>
            }
          />
        ) : clients.length === 0 ? (
          <PremiumEmptyState
            icon="📈"
            title="No clients in the pipeline"
            description="Add your first client, then move the opportunity through each sales stage."
            action={
              <Link
                className="cp-premium-button cp-button-gold"
                href="/dashboard/clients"
              >
                Add First Client
              </Link>
            }
          />
        ) : (
          <section className="cp-pipeline-board">
            {stages.map((stage) => {
              const stageClients =
                clients.filter(
                  (client) =>
                    (client.stage ||
                      "new_lead") ===
                    stage.key
                );

              return (
                <section
                  className={`cp-pipeline-column cp-pipeline-${stage.key}`}
                  key={stage.key}
                >
                  <header className="cp-pipeline-column-head">
                    <div className="cp-pipeline-stage-icon">
                      {stage.icon}
                    </div>

                    <div>
                      <div className="cp-pipeline-stage-title">
                        <h2>{stage.label}</h2>

                        <StatusBadge
                          tone={stage.tone}
                        >
                          {stageClients.length}
                        </StatusBadge>
                      </div>

                      <p>{stage.helper}</p>
                    </div>
                  </header>

                  <div className="cp-pipeline-cards">
                    {stageClients.length === 0 ? (
                      <div className="cp-pipeline-empty">
                        <span>Empty stage</span>
                        <p>
                          Move a client here when
                          their deal reaches this
                          step.
                        </p>
                      </div>
                    ) : (
                      stageClients.map(
                        (client) => (
                          <article
                            className="cp-deal-card"
                            key={client.id}
                          >
                            <div className="cp-deal-card-top">
                              <div className="cp-deal-avatar">
                                {initials(
                                  client.name
                                ) || "CL"}
                              </div>

                              <div className="cp-deal-main">
                                <Link
                                  href={`/dashboard/clients/${client.id}`}
                                >
                                  {client.name}
                                </Link>

                                <span>
                                  {client.company ||
                                    "No company"}
                                </span>
                              </div>

                              <Link
                                className="cp-deal-open"
                                href={`/dashboard/clients/${client.id}`}
                                aria-label={`Open ${client.name}`}
                              >
                                →
                              </Link>
                            </div>

                            <div className="cp-deal-contact">
                              <span>
                                📞{" "}
                                {client.phone ||
                                  "No phone"}
                              </span>

                              <span>
                                ✉{" "}
                                {client.email ||
                                  "No email"}
                              </span>
                            </div>

                            <div className="cp-deal-meta">
                              <span>
                                Added{" "}
                                {formatDate(
                                  client.created_at
                                )}
                              </span>
                            </div>

                            <form
                              className="cp-deal-move-form"
                              action={
                                updateClientStage
                              }
                            >
                              <input
                                type="hidden"
                                name="clientId"
                                value={client.id}
                              />

                              <label>
                                Move to stage
                                <select
                                  className="cp-select"
                                  name="stage"
                                  defaultValue={
                                    client.stage ||
                                    "new_lead"
                                  }
                                >
                                  {stages.map(
                                    (option) => (
                                      <option
                                        value={
                                          option.key
                                        }
                                        key={
                                          option.key
                                        }
                                      >
                                        {
                                          option.label
                                        }
                                      </option>
                                    )
                                  )}
                                </select>
                              </label>

                              <button
                                className="cp-premium-button cp-button-gold"
                                type="submit"
                              >
                                Update Stage
                              </button>
                            </form>
                          </article>
                        )
                      )
                    )}
                  </div>
                </section>
              );
            })}
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
