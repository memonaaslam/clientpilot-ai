import { DashboardShell } from "@/components/DashboardShell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import Link from "next/link";

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
  { key: "new_lead", label: "New Lead" },
  { key: "meeting_done", label: "Meeting Done" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "follow_up", label: "Follow-Up" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" }
];

async function updateClientStage(formData: FormData) {
  "use server";

  const clientId = String(formData.get("clientId") || "");
  const stage = String(formData.get("stage") || "new_lead");

  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !clientId) return;

  await supabase
    .from("clients")
    .update({ stage })
    .eq("id", clientId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
}

export default async function PipelinePage() {
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
      <div className="page-hero">
        <div>
          <span className="badge">Sales CRM</span>
          <h1 style={{ fontSize: 46 }}>Pipeline</h1>
          <p className="muted">
            Move clients from lead to meeting, proposal, follow-up, won, or lost.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>{clients.length}</strong>
          <span>Total clients</span>
        </div>
      </div>

      {!user ? (
        <div className="card">
          <p>Please login first from /login.</p>
        </div>
      ) : null}

      {clients.length === 0 ? (
        <div className="empty-state">
          <h3>No clients yet</h3>
          <p className="muted">Add a client first, then manage the deal stage here.</p>
        </div>
      ) : null}

      <div className="pipeline-board">
        {stages.map((stage) => {
          const stageClients = clients.filter(
            (client) => (client.stage || "new_lead") === stage.key
          );

          return (
            <section className="pipeline-column" key={stage.key}>
              <div className="pipeline-column-head">
                <h3>{stage.label}</h3>
                <span>{stageClients.length}</span>
              </div>

              <div className="pipeline-cards">
                {stageClients.length === 0 ? (
                  <p className="muted small-muted">No clients</p>
                ) : null}

                {stageClients.map((client) => (
                  <div className="pipeline-card" key={client.id}>
                    <Link href={`/dashboard/clients/${client.id}`}>
                      <strong>{client.name}</strong>
                    </Link>

                    <p className="muted">
                      {client.company || "No company"}
                      <br />
                      {client.phone || "No phone"}
                    </p>

                    <form className="pipeline-form" action={updateClientStage}>
                      <input type="hidden" name="clientId" value={client.id} />
                      <select className="input" name="stage" defaultValue={client.stage || "new_lead"}>
                        {stages.map((option) => (
                          <option value={option.key} key={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button className="btn gold" type="submit">
                        Move
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </DashboardShell>
  );
}