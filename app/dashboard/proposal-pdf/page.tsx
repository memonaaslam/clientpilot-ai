import { DashboardShell } from "@/components/DashboardShell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/sales-session";

export const dynamic = "force-dynamic";

export default async function ProposalPdfPage() {
  const authSupabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await authSupabase.auth.getUser();

  if (!user) {
    return (
      <DashboardShell>
        <div className="empty-state">
          <h2>Please sign in first</h2>
          <p className="muted">Login to export proposal PDFs.</p>
        </div>
      </DashboardShell>
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data: proposals } = await supabase
    .from("proposals")
    .select("id,title,client_name,amount,status,created_at")
    .eq("user_id", user.id)
    .eq("deleted", false)
    .order("created_at", { ascending: false });

  return (
    <DashboardShell>
      <div className="proposal-pdf-page">
        <div className="page-hero">
          <div>
            <span className="badge">Professional PDF</span>
            <h1 style={{ fontSize: 48 }}>Export proposal PDFs</h1>
            <p className="muted">
              Download polished, client-ready proposal PDFs with premium formatting.
            </p>
          </div>

          <div className="hero-mini-card">
            <strong>{proposals?.length || 0}</strong>
            <span>Proposals</span>
          </div>
        </div>

        <section className="proposal-pdf-grid">
          {(proposals || []).map((proposal) => (
            <article className="proposal-pdf-card" key={proposal.id}>
              <div>
                <span>{proposal.status || "draft"}</span>
                <h2>{proposal.title}</h2>
                <p>{proposal.client_name || "Client not linked"}</p>
              </div>

              <div className="proposal-pdf-meta">
                <strong>{proposal.amount ? `$${Number(proposal.amount).toLocaleString()}` : "Amount not set"}</strong>
                <small>
                  {proposal.created_at
                    ? new Date(proposal.created_at).toLocaleDateString()
                    : "No date"}
                </small>
              </div>

              <a href={`/clientpilotai/api/proposal-pdf?id=${proposal.id}`} className="proposal-pdf-btn">
                Download Professional PDF
              </a>
            </article>
          ))}

          {(!proposals || proposals.length === 0) ? (
            <div className="empty-state">
              <h2>No proposals yet</h2>
              <p className="muted">Create a proposal first, then export it as a professional PDF.</p>
            </div>
          ) : null}
        </section>
      </div>
    </DashboardShell>
  );
}


