import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

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

  if (!user) throw new Error("Not logged in");

  await supabase.from("clients").insert({
    user_id: user.id,
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    company: String(formData.get("company") || ""),
    notes: String(formData.get("notes") || ""),
    stage: "new_lead"
  });

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
      <div className="page-hero">
        <div>
          <span className="badge">Client CRM</span>
          <h1 style={{ fontSize: 46 }}>Clients</h1>
          <p className="muted">
            Add leads, save client details, and open their full AI memory.
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

      <div className="grid two">
        <div className="card">
          <h3>Add Client</h3>
          <form className="form" action={createClient}>
            <input className="input" name="name" placeholder="Client name" required />
            <input className="input" name="phone" placeholder="Phone / WhatsApp" />
            <input className="input" name="email" placeholder="Email" />
            <input className="input" name="company" placeholder="Company" />
            <textarea className="textarea" name="notes" placeholder="Notes / requirement" />
            <button className="btn gold" type="submit">
              Save Client
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Client List</h3>

          {clients.length === 0 ? (
            <p className="muted">No clients yet.</p>
          ) : (
            <div className="client-list">
              {clients.map((client) => (
                <Link className="client-row-pro" href={`/dashboard/clients/${client.id}`} key={client.id}>
                  <div>
                    <strong>{client.name}</strong>
                    <span>
                      {client.company || "No company"} · {client.phone || "No phone"}
                    </span>
                  </div>
                  <small>{stageLabel(client.stage)}</small>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
