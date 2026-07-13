import Link from "next/link";
import { revalidatePath } from "next/cache";

import { DashboardShell } from "@/components/DashboardShell";
import {
  PremiumCard,
  PremiumEmptyState,
  SectionHeader,
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

async function createClient(formData: FormData) {
  "use server";

  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not logged in");
  }

  const name = String(formData.get("name") || "").trim();

  if (!name) {
    throw new Error("Client name is required.");
  }

  const { error } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      name,
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      company: String(formData.get("company") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
      stage: "new_lead"
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
}

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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function ClientsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data } = user
    ? await supabase
        .from("clients")
        .select("id,name,phone,email,company,stage,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const clients = (data || []) as ClientRecord[];

  return (
    <DashboardShell>
      <div className="cp-page">
        <section className="cp-clients-hero">
          <div>
            <span className="cp-eyebrow">
              Client CRM
            </span>

            <h1>Clients</h1>

            <p>
              Add leads, organize contact details, and open each client&apos;s full sales history.
            </p>
          </div>

          <div className="cp-clients-total">
            <strong>{clients.length}</strong>
            <span>Total clients</span>
          </div>
        </section>

        {!user ? (
          <PremiumEmptyState
            icon="🔐"
            title="Please sign in first"
            description="Login to manage clients and open their AI sales history."
            action={
              <Link
                className="cp-premium-button cp-button-gold"
                href="/login"
              >
                Open Login
              </Link>
            }
          />
        ) : (
          <div className="cp-clients-layout">
            <PremiumCard
              className="cp-add-client-card"
              padding="large"
            >
              <SectionHeader
                eyebrow="New Lead"
                title="Add a client"
                description="Save the essentials now. Meetings, tasks, reminders, and proposals will build the rest of the client profile automatically."
              />

              <form
                className="cp-form-grid"
                action={createClient}
              >
                <div className="cp-field">
                  <label>Client name</label>
                  <input
                    className="cp-input"
                    name="name"
                    placeholder="Ahmed Al Mansoori"
                    required
                  />
                </div>

                <div className="cp-field">
                  <label>Company</label>
                  <input
                    className="cp-input"
                    name="company"
                    placeholder="Al Noor Holdings"
                  />
                </div>

                <div className="cp-field">
                  <label>Phone / WhatsApp</label>
                  <input
                    className="cp-input"
                    name="phone"
                    placeholder="+971..."
                  />
                </div>

                <div className="cp-field">
                  <label>Email</label>
                  <input
                    className="cp-input"
                    name="email"
                    type="email"
                    placeholder="client@company.com"
                  />
                </div>

                <div className="cp-field cp-field-full">
                  <label>Notes / requirement</label>
                  <textarea
                    className="cp-textarea"
                    name="notes"
                    placeholder="Add any initial requirement, context, or next step..."
                  />
                </div>

                <div className="cp-field cp-field-full">
                  <button
                    className="cp-premium-button cp-button-gold"
                    type="submit"
                  >
                    Save Client
                  </button>
                </div>
              </form>
            </PremiumCard>

            <PremiumCard padding="large">
              <SectionHeader
                eyebrow="Client Directory"
                title="Your clients"
                description="Open a client to view contact details, activity history, meetings, tasks, reminders, and proposals."
              />

              {clients.length === 0 ? (
                <PremiumEmptyState
                  icon="👥"
                  title="No clients yet"
                  description="Add your first client using the form. Their full AI memory will grow as you add meetings and follow-ups."
                />
              ) : (
                <div className="cp-client-directory">
                  {clients.map((client) => (
                    <Link
                      className="cp-client-card"
                      href={`/dashboard/clients/${client.id}`}
                      key={client.id}
                    >
                      <div className="cp-client-avatar">
                        {initials(client.name) || "CL"}
                      </div>

                      <div className="cp-client-card-body">
                        <div className="cp-client-card-head">
                          <div>
                            <strong>{client.name}</strong>
                            <span>
                              {client.company || "No company"}
                            </span>
                          </div>

                          <StatusBadge tone={stageTone(client.stage)}>
                            {stageLabel(client.stage)}
                          </StatusBadge>
                        </div>

                        <div className="cp-client-contact-row">
                          <span>
                            {client.phone || "No phone"}
                          </span>
                          <span>
                            {client.email || "No email"}
                          </span>
                        </div>
                      </div>

                      <span className="cp-client-open">
                        Open →
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </PremiumCard>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
