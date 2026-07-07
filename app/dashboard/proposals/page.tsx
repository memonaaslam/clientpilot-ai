import { CopyButton } from "@/components/CopyButton";
import { DashboardShell } from "@/components/DashboardShell";
import { PrintProposalButton } from "@/components/PrintProposalButton";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RelationName = { name?: string } | { name?: string }[] | null;
type RelationTitle = { title?: string } | { title?: string }[] | null;

type ProposalRecord = {
  id: string;
  title: string;
  content: string;
  status: string | null;
  created_at: string;
  clients: RelationName;
  meetings: RelationTitle;
};

function getClientName(client: RelationName) {
  if (Array.isArray(client)) return client[0]?.name || "Unknown client";
  return client?.name || "Unknown client";
}

function getMeetingTitle(meeting: RelationTitle) {
  if (Array.isArray(meeting)) return meeting[0]?.title || "No meeting";
  return meeting?.title || "No meeting";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

export default async function ProposalsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data } = user
    ? await supabase
        .from("proposals")
        .select("id,title,content,status,created_at,clients(name),meetings(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const proposals = (data || []) as unknown as ProposalRecord[];

  return (
    <DashboardShell>
      <div className="page-hero">
        <div>
          <span className="badge">Proposal Center</span>
          <h1 style={{ fontSize: 46 }}>Proposals</h1>
          <p className="muted">
            Saved proposal drafts created from client meetings.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>{proposals.length}</strong>
          <span>Saved proposals</span>
        </div>
      </div>

      {!user ? (
        <div className="card">
          <p>Please login first from /login.</p>
        </div>
      ) : null}

      {proposals.length === 0 ? (
        <div className="empty-state">
          <h3>No proposals yet</h3>
          <p className="muted">
            Open a client, generate a proposal from a meeting, and click Save Proposal.
          </p>
        </div>
      ) : null}

      <div className="meeting-list">
        {proposals.map((proposal) => (
          <article className="meeting-card" key={proposal.id}>
            <div className="pill-row">
              <span className="pill">{getClientName(proposal.clients)}</span>
              <span className="pill soft">{getMeetingTitle(proposal.meetings)}</span>
              <span className="pill soft">{formatDate(proposal.created_at)}</span>
            </div>

            <div className="section-head" style={{ marginTop: 16 }}>
              <h2>{proposal.title}</h2>
              <div className="proposal-actions">
                <CopyButton text={proposal.content} label="Copy proposal" />
                <PrintProposalButton title={proposal.title} content={proposal.content} />
              </div>
            </div>

            <pre className="proposal-output">{proposal.content}</pre>
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}