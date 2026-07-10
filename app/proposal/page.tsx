import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase admin credentials are missing.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false
    }
  });
}

function formatAmount(amount?: number | null, currency?: string | null) {
  if (!amount) return "To be confirmed";
  return `${currency || "AED"} ${Number(amount).toLocaleString()}`;
}

function cleanContent(content?: string | null) {
  return String(content || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removePrivateHeader(content: string) {
  const markers = [
    "PROJECT UNDERSTANDING",
    "CLIENT REQUIREMENTS",
    "RECOMMENDED SOLUTION",
    "PROPOSED SCOPE"
  ];

  const lines = cleanContent(content).split("\n");
  const index = lines.findIndex((line) =>
    markers.includes(line.trim().toUpperCase())
  );

  return index >= 0 ? lines.slice(index).join("\n").trim() : cleanContent(content);
}

function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    draft: "Draft",
    pending_owner_review: "Pending Owner Review",
    approved: "Approved",
    changes_requested: "Changes Requested",
    sent: "Sent",
    accepted: "Accepted",
    rejected: "Rejected"
  };

  return labels[status || "draft"] || status || "Draft";
}

export default async function PublicProposalPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = String(params.token || "");

  const supabase = createSupabaseAdmin();

  if (!token) {
    return (
      <main className="public-proposal-page">
        <section className="public-proposal-empty">
          <h1>Proposal link missing</h1>
          <p>Please open the proposal using the full share link.</p>
          <Link href="/">Back to ClientPilot AI</Link>
        </section>
      </main>
    );
  }

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("share_token", token)
    .eq("deleted", false)
    .maybeSingle();

  if (!proposal) {
    return (
      <main className="public-proposal-page">
        <section className="public-proposal-empty">
          <h1>Proposal not found</h1>
          <p>This proposal link is unavailable or has been removed.</p>
          <Link href="/">Back to ClientPilot AI</Link>
        </section>
      </main>
    );
  }

  const { data: settings } = await supabase
    .from("business_settings")
    .select("business_name,logo_text,logo_url,currency")
    .eq("user_id", proposal.user_id)
    .maybeSingle();

  const businessName = settings?.business_name || "Business";
  const roleTitle = settings?.logo_text || "Professional Services";
  const currency = settings?.currency || "AED";
  const content = removePrivateHeader(proposal.content);

  return (
    <main className="public-proposal-page">
      <section className="public-proposal-shell">
        <header className="public-proposal-header">
          <div className="public-brand">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={businessName} />
            ) : (
              <span>{businessName.slice(0, 1).toUpperCase()}</span>
            )}

            <div>
              <strong>{businessName}</strong>
              <small>{roleTitle}</small>
            </div>
          </div>

          <div className="public-proposal-status">
            <span>{statusLabel(proposal.status)}</span>
          </div>
        </header>

        <section className="public-proposal-hero">
          <span>Client Proposal</span>
          <h1>{proposal.title}</h1>
          <p>
            Prepared for <strong>{proposal.client_name || "Client"}</strong>
          </p>
        </section>

        <section className="public-proposal-summary">
          <div>
            <span>Investment</span>
            <strong>{formatAmount(proposal.amount, currency)}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>{statusLabel(proposal.status)}</strong>
          </div>
        </section>

        <section className="public-proposal-content">
          <pre>{content}</pre>
        </section>

        <footer className="public-proposal-footer">
          <strong>ClientPilot AI</strong>
          <span>Smart CRM • Follow-up Automation • Proposal Workflow</span>

          <div>
            <small>Software Developed by</small>
            <img src="/makzora-logo-official.png" alt="Makzora" />
          </div>
        </footer>
      </section>
    </main>
  );
}