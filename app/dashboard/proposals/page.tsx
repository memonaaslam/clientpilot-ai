import { DashboardShell } from "@/components/DashboardShell";
import { ProposalManager } from "@/components/ProposalManager";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ClientOption = {
  id: string;
  name: string;
};

export default async function ProposalsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardShell>
        <div className="empty-state">
          <h2>Please sign in first</h2>
          <p className="muted">Login to create and manage proposals.</p>
        </div>
      </DashboardShell>
    );
  }

  const { data } = await supabase
    .from("clients")
    .select("id,name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const clients: ClientOption[] = (data || []).map((client: any) => ({
    id: String(client.id),
    name: String(client.name)
  }));

  return (
    <DashboardShell>
      <div className="page-hero">
        <div>
          <span className="badge">Proposal Builder</span>
          <h1 style={{ fontSize: 46 }}>Proposals</h1>
          <p className="muted">
            Create, edit, manage, and recycle professional client proposals.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>Edit</strong>
          <span>Ready</span>
        </div>
      </div>

      <ProposalManager clients={clients} />
    </DashboardShell>
  );
}