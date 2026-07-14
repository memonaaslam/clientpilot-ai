"use client";

import { useEffect, useMemo, useState } from "react";

type ClientOption = { id: string; name: string };

type Proposal = {
  id: string;
  client_id?: string | null;
  client_name?: string | null;
  title: string;
  content: string;
  amount?: number | null;
  status?: string | null;
  updated_at?: string | null;
  sales_user_id?: string | null;
  share_token?: string | null;
  content_note?: string | null;
};

function professionalTemplate(clientName: string) {
  const name = clientName || "Client";
  return `${name} - Service Proposal
PROPOSAL DRAFT
Prepared By: Memona Aslam
Client: ${name}
Currency: AED

PROJECT UNDERSTANDING
Thank you for the opportunity to submit this proposal. Based on our discussion, this document outlines the recommended solution, key deliverables, timeline, and next steps.

CLIENT REQUIREMENTS
- Requirement 1
- Requirement 2
- Requirement 3

RECOMMENDED SOLUTION
We recommend a structured service plan focused on clear execution, consistent communication, and measurable outcomes.

PROPOSED SCOPE
1. Requirement review and final briefing
2. Concept direction and recommended solution
3. Scope confirmation and deliverables planning
4. Timeline and execution planning
5. Official quotation preparation
6. Follow-up coordination and approval support

EXPECTED DELIVERABLES
- Professional proposal draft
- Clear project scope
- Timeline and next steps
- Follow-up message for client approval

RECOMMENDED NEXT STEP
Schedule a follow-up call, confirm the final scope, and send the official quotation for approval.`;
}

function formatDate(value?: string | null) {
  if (!value) return "Recently updated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatAmount(value?: number | null) {
  if (!value) return "Not set";
  return `AED ${new Intl.NumberFormat("en", {
    maximumFractionDigits: 0
  }).format(value)}`;
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

function getShareUrl(token?: string | null) {
  if (!token || typeof window === "undefined") return "";
  return `${window.location.origin}/clientpilotai/proposal?token=${token}`;
}

export function ProposalManager({ clients }: { clients: ClientOption[] }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("Service Proposal");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("draft");
  const [content, setContent] = useState(professionalTemplate(""));
  const [message, setMessage] = useState("");

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId),
    [clients, clientId]
  );

  const draftCount = proposals.filter((p) => (p.status || "draft") === "draft").length;
  const reviewCount = proposals.filter((p) => p.status === "pending_owner_review").length;
  const acceptedCount = proposals.filter((p) => p.status === "accepted").length;
  const totalValue = proposals.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const acceptanceRate = proposals.length
    ? Math.round((acceptedCount / proposals.length) * 100)
    : 0;

  async function loadProposals() {
    setLoading(true);
    try {
      const response = await fetch("/clientpilotai/api/proposals", {
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Unable to load proposals.");
        setProposals([]);
        return;
      }
      setProposals(data.proposals || []);
    } catch {
      setMessage("Unable to connect to the proposal service.");
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProposals();
  }, []);

  useEffect(() => {
    if (!editingId) {
      setContent(professionalTemplate(selectedClient?.name || ""));
    }
  }, [clientId, selectedClient?.name, editingId]);

  function resetForm() {
    setEditingId(null);
    setClientId("");
    setTitle("Service Proposal");
    setAmount("");
    setStatus("draft");
    setContent(professionalTemplate(""));
  }

  function editProposal(proposal: Proposal) {
    setEditingId(proposal.id);
    setClientId(proposal.client_id || "");
    setTitle(proposal.title || "Service Proposal");
    setAmount(proposal.amount == null ? "" : String(proposal.amount));
    setStatus(proposal.status || "draft");
    setContent(
      proposal.content ||
        professionalTemplate(proposal.client_name || "")
    );
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProposal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      client_id: selectedClient?.id || null,
      client_name: selectedClient?.name || null,
      title: title.trim(),
      content: content.trim(),
      amount: amount.trim(),
      status
    };

    if (!payload.title || !payload.content) {
      setMessage("Proposal title and content are required.");
      setSaving(false);
      return;
    }

    try {
      const endpoint = editingId
        ? `/clientpilotai/api/proposals/${editingId}`
        : "/clientpilotai/api/proposals";

      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to save proposal.");
        return;
      }

      setMessage(
        editingId
          ? "Proposal updated successfully."
          : "Proposal created successfully."
      );
      resetForm();
      await loadProposals();
    } catch {
      setMessage("Unable to connect to the proposal service.");
    } finally {
      setSaving(false);
    }
  }

  async function patchProposal(proposal: Proposal, body: Record<string, unknown>, success: string) {
    setMessage("");
    try {
      const response = await fetch(
        `/clientpilotai/api/proposals/${proposal.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Unable to update proposal.");
        return false;
      }
      setMessage(success);
      await loadProposals();
      return true;
    } catch {
      setMessage("Unable to connect to the proposal service.");
      return false;
    }
  }

  async function copyShareLink(proposal: Proposal) {
    const url = getShareUrl(proposal.share_token);
    if (!url) {
      setMessage("Create a share link first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Share link copied.");
    } catch {
      setMessage("Unable to copy share link.");
    }
  }

  async function moveToRecycle(proposal: Proposal) {
    if (!window.confirm("Move this proposal to Recycle Bin?")) return;
    const previous = proposals;
    setProposals((current) => current.filter((item) => item.id !== proposal.id));
    const ok = await patchProposal(
      proposal,
      { deleted: true },
      "Proposal moved to Recycle Bin."
    );
    if (!ok) setProposals(previous);
  }

  const messageIsError =
    message.toLowerCase().includes("unable") ||
    message.toLowerCase().includes("required");

  return (
    <div className="cp-proposal-command-center">
      <section className="cp-proposal-overview">
        <div>
          <span className="cp-eyebrow">Proposal Intelligence</span>
          <h2>Create, approve, and close more deals.</h2>
          <p>
            Build professional proposals, review approvals, export PDFs,
            share secure links, and track commercial progress.
          </p>
        </div>

        <div className="cp-proposal-kpi-grid">
          <div><span>Total</span><strong>{proposals.length}</strong></div>
          <div><span>Draft</span><strong>{draftCount}</strong></div>
          <div><span>Waiting Review</span><strong>{reviewCount}</strong></div>
          <div><span>Accepted</span><strong>{acceptedCount}</strong></div>
        </div>
      </section>

      <div className="cp-proposal-intelligence-grid">
        <section className="cp-proposal-value-card">
          <span className="cp-eyebrow">Commercial Value</span>
          <strong>{formatAmount(totalValue)}</strong>
          <p>Total value across active proposals.</p>
        </section>

        <section className="cp-proposal-rate-card">
          <span className="cp-eyebrow">Acceptance Rate</span>
          <div><strong>{acceptanceRate}%</strong><span>{acceptedCount} accepted</span></div>
          <div className="cp-proposal-rate-track">
            <i style={{ width: `${acceptanceRate}%` }} />
          </div>
        </section>

        <section className="cp-proposal-ai-card">
          <span className="cp-eyebrow">AI Insight</span>
          <h3>
            {reviewCount
              ? `${reviewCount} proposal${reviewCount === 1 ? "" : "s"} need owner review.`
              : "Create a proposal from your next meeting."}
          </h3>
        </section>
      </div>

      <div className="cp-proposal-workspace">
        <section className="cp-proposal-editor-card">
          <div className="cp-proposal-card-head">
            <div>
              <span className="cp-eyebrow">
                {editingId ? "Edit Proposal" : "New Proposal"}
              </span>
              <h2>{editingId ? "Update proposal" : "Create professional proposal"}</h2>
              <p>Build on the left and preview the final content on the right.</p>
            </div>

            {editingId ? (
              <button className="cp-premium-button cp-button-soft" type="button" onClick={resetForm}>
                Cancel Edit
              </button>
            ) : null}
          </div>

          <form className="cp-proposal-editor-form" onSubmit={saveProposal}>
            <div className="cp-proposal-form-grid">
              <label>
                Client
                <select className="cp-select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">General proposal</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Proposal title
                <input className="cp-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </label>

              <label>
                Amount
                <input className="cp-input" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" placeholder="5000" />
              </label>

              <label>
                Status
                <select className="cp-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="pending_owner_review">Pending Owner Review</option>
                  <option value="approved">Approved</option>
                  <option value="changes_requested">Changes Requested</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
            </div>

            <label>
              Proposal content
              <textarea
                className="cp-textarea cp-proposal-content-editor"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </label>

            {message ? (
              <p className={`cp-proposal-message ${messageIsError ? "cp-proposal-message-error" : "cp-proposal-message-success"}`}>
                {message}
              </p>
            ) : null}

            <button className="cp-premium-button cp-button-gold" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Proposal"}
            </button>
          </form>
        </section>

        <aside className="cp-proposal-preview-card">
          <div className="cp-proposal-preview-head">
            <div>
              <span className="cp-eyebrow">Live Preview</span>
              <h3>{title || "Service Proposal"}</h3>
              <p>{selectedClient?.name || "General proposal"}</p>
            </div>
            <span className={`cp-proposal-status-pill cp-proposal-status-${status}`}>
              {statusLabel(status)}
            </span>
          </div>

          <div className="cp-proposal-preview-meta">
            <div><span>Client</span><strong>{selectedClient?.name || "General"}</strong></div>
            <div><span>Amount</span><strong>{amount ? `AED ${amount}` : "Not set"}</strong></div>
          </div>

          <pre>{content}</pre>
        </aside>
      </div>

      <section className="cp-proposal-library-card">
        <div className="cp-proposal-library-head">
          <div>
            <span className="cp-eyebrow">Proposal Library</span>
            <h2>Active proposals</h2>
            <p>Export, share, edit, approve, or move a proposal to Recycle Bin.</p>
          </div>
          <div className="cp-proposal-library-count">{proposals.length}<span>Active</span></div>
        </div>

        {loading ? <div className="cp-proposal-loading">Loading proposals...</div> : null}

        {!loading && proposals.length === 0 ? (
          <div className="cp-proposal-empty">
            <span>📄</span><h3>No active proposals</h3><p>Create your first proposal above.</p>
          </div>
        ) : null}

        <div className="cp-proposal-list">
          {proposals.map((proposal) => {
            const shareUrl = getShareUrl(proposal.share_token);
            const shareText = `Hi ${proposal.client_name || "there"}, please review the proposal here: ${shareUrl}`;

            return (
              <article className="cp-proposal-row-card" key={proposal.id}>
                <div className="cp-proposal-row-main">
                  <div className="cp-proposal-row-top">
                    <span className={`cp-proposal-status-pill cp-proposal-status-${proposal.status || "draft"}`}>
                      {statusLabel(proposal.status)}
                    </span>
                    {proposal.sales_user_id ? <span className="cp-proposal-sales-badge">Sales Staff</span> : null}
                  </div>

                  <h3>{proposal.title}</h3>
                  <p>{proposal.client_name || "General proposal"} · {formatDate(proposal.updated_at)}</p>

                  <div className="cp-proposal-row-meta">
                    <span>{formatAmount(proposal.amount)}</span>
                    <span>{proposal.share_token ? "Share link ready" : "Private"}</span>
                  </div>

                  {proposal.status === "changes_requested" ? (
                    <div className="cp-proposal-client-note">
                      <strong>Client note</strong>
                      <p>{proposal.content_note || "No note provided by client."}</p>
                    </div>
                  ) : null}
                </div>

                <div className="cp-proposal-row-actions">
                  {proposal.status === "pending_owner_review" ? (
                    <>
                      <button className="cp-premium-button cp-button-gold" type="button"
                        onClick={() => void patchProposal(proposal, { status: "approved" }, "Proposal approved successfully.")}>
                        Approve
                      </button>
                      <button className="cp-premium-button cp-button-soft" type="button"
                        onClick={() => void patchProposal(proposal, { status: "changes_requested" }, "Changes requested.")}>
                        Request Changes
                      </button>
                    </>
                  ) : null}

                  <a className="cp-premium-button cp-button-dark"
                    href={`/clientpilotai/api/proposal-pdf?id=${proposal.id}`}
                    target="_blank" rel="noreferrer">
                    Export PDF
                  </a>

                  {!proposal.share_token ? (
                    <button className="cp-premium-button cp-button-soft" type="button"
                      onClick={() => void patchProposal(proposal, { create_share_link: true }, "Share link created successfully.")}>
                      Create Share Link
                    </button>
                  ) : (
                    <>
                      <button className="cp-premium-button cp-button-soft" type="button" onClick={() => void copyShareLink(proposal)}>Copy Link</button>
                      <a className="cp-premium-button cp-button-soft" href={shareUrl} target="_blank" rel="noreferrer">Open Link</a>
                      <a className="cp-premium-button cp-button-soft" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                      <a className="cp-premium-button cp-button-soft" href={`mailto:?subject=${encodeURIComponent(proposal.title)}&body=${encodeURIComponent(shareText)}`}>Email</a>
                    </>
                  )}

                  <button className="cp-premium-button cp-button-gold" type="button" onClick={() => editProposal(proposal)}>Edit</button>
                  <button className="cp-premium-button cp-button-danger" type="button" onClick={() => void moveToRecycle(proposal)}>Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
