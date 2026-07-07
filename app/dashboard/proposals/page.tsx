import { CopyButton } from "@/components/CopyButton";
import { DashboardShell } from "@/components/DashboardShell";
import { PrintProposalButton } from "@/components/PrintProposalButton";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function ProposalsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardShell>
        <div className="card">
          <p>Please login first from /login.</p>
        </div>
      </DashboardShell>
    );
  }

  const { data: settings } = await supabase
    .from("business_settings")
    .select("business_name,logo_text,logo_url")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: proposals } = await supabase
    .from("proposals")
    .select("id,title,content,status,created_at,clients(name),meetings(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const brandName =
    settings?.business_name ||
    settings?.logo_text ||
    "ClientPilot AI";

  return (
    <DashboardShell>
      <div className="page-hero">
        <div>
          <span className="badge">Proposal Library</span>
          <h1 style={{ fontSize: 46 }}>Saved Proposals</h1>
          <p className="muted">
            Review, copy, print, or save your generated client proposals.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>{proposals?.length || 0}</strong>
          <span>Saved proposals</span>
        </div>
      </div>

      {(proposals || []).length === 0 ? (
        <div className="empty-state">
          <p className="muted">
            No proposals saved yet. Open a client memory page and generate one.
          </p>
        </div>
      ) : (
        <div className="meeting-list">
          {(proposals || []).map((proposal) => {
            const clientData = proposal.clients as { name?: string } | null;
            const meetingData = proposal.meetings as { title?: string } | null;

            return (
              <article className="proposal-card" key={proposal.id}>
                <div className="section-head">
                  <div>
                    <span className="pill soft">{proposal.status}</span>
                    <h3>{proposal.title}</h3>
                    <p className="muted">
                      Client: {clientData?.name || "Unknown"} | Meeting:{" "}
                      {meetingData?.title || "Manual proposal"}
                    </p>
                  </div>

                  <div className="proposal-actions">
                    <CopyButton text={proposal.content} label="Copy proposal" />

                    <PrintProposalButton
                      title={proposal.title}
                      content={proposal.content}
                      brandName={brandName}
                      logoUrl={settings?.logo_url}
                    />
                  </div>
                </div>

                <pre className="proposal-output">{proposal.content}</pre>
              </article>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}