"use client";

import { useEffect, useMemo, useState } from "react";

type ClientOption = {
  id: string;
  name: string;
};

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
};

type ProposalManagerProps = {
  clients: ClientOption[];
};

function professionalTemplate(clientName: string) {
  const name = clientName || "Client";

  return `${name} - Service Proposal
PROPOSAL DRAFT
Prepared By: Memona Aslam
Client: ${name}
Company: Not specified
Phone: Not specified
Email: Not specified
Meeting: Service Proposal
Currency: AED
Budget/pricing: Budget was not clearly confirmed in the notes.
Timeline: Timeline was not clearly confirmed in the notes.

PROJECT UNDERSTANDING
Thank you for the opportunity to submit this proposal. Based on our discussion, this proposal outlines the recommended solution, key deliverables, timeline, and next steps.

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
Schedule a follow-up call or site visit, confirm the final scope, and send the official quotation for approval.`;
}

function formatDate(value?: string | null) {
  if (!value) return "Recently updated";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusLabel(status?: string | null) {
  const value = status || "draft";

  const labels: Record<string, string> = {
    draft: "Draft",
    pending_owner_review: "Pending Owner Review",
    approved: "Approved",
    changes_requested: "Changes Requested",
    sent: "Sent",
    accepted: "Accepted",
    rejected: "Rejected"
  };

  return labels[value] || value;
}

function getShareUrl(token?: string | null) {
  if (!token || typeof window === "undefined") return "";
  return `${window.location.origin}/proposal?token=${token}`;
}

export function ProposalManager({ clients }: ProposalManagerProps) {
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

  async function loadProposals() {
    setLoading(true);

    try {
      const response = await fetch("/api/proposals", { cache: "no-store" });
      const data = await response.json();
      setProposals(data.proposals || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProposals();
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
    setAmount(proposal.amount ? String(proposal.amount) : "");
    setStatus(proposal.status || "draft");
    setContent(proposal.content || professionalTemplate(proposal.client_name || ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProposal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      client_id: selectedClient?.id || null,
      client_name: selectedClient?.name || null,
      title,
      content,
      amount,
      status
    };

    try {
      const response = await fetch(
        editingId ? `/api/proposals/${editingId}` : "/api/proposals",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to save proposal.");
        return;
      }

      setMessage(editingId ? "Proposal updated successfully." : "Proposal created successfully.");
      resetForm();
      await loadProposals();
    } finally {
      setSaving(false);
    }
  }

  async function updateProposalStatus(proposal: Proposal, nextStatus: string) {
    setMessage("");

    const response = await fetch(`/api/proposals/${proposal.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: nextStatus
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Unable to update proposal.");
      return;
    }

    setMessage(
      nextStatus === "approved"
        ? "Proposal approved successfully."
        : "Changes requested for this proposal."
    );

    await loadProposals();
  }

  async function createShareLink(proposal: Proposal) {
    setMessage("");

    const response = await fetch(`/api/proposals/${proposal.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        create_share_link: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Unable to create share link.");
      return;
    }

    setMessage("Share link created successfully.");
    await loadProposals();
  }

  async function copyShareLink(proposal: Proposal) {
    const url = getShareUrl(proposal.share_token);

    if (!url) {
      setMessage("Create a share link first.");
      return;
    }

    await navigator.clipboard.writeText(url);
    setMessage("Share link copied.");
  }

  async function moveToRecycle(proposal: Proposal) {
    const confirmDelete = window.confirm("Delete this proposal from Active Proposals? It will move to Recycle Bin.");

    if (!confirmDelete) return;

    setMessage("");

    const previousProposals = proposals;

    setProposals((current) => current.filter((item) => item.id !== proposal.id));

    try {
      const response = await fetch(`/api/proposals/${proposal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          deleted: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setProposals(previousProposals);
        setMessage(data.error || "Unable to delete proposal.");
        return;
      }

      setMessage("Proposal deleted from Active Proposals and moved to Recycle Bin.");
      await loadProposals();
    } catch {
      setProposals(previousProposals);
      setMessage("Unable to delete proposal.");
    }
  }

  return (
    <div className="proposal-manager-layout">
      <section className="proposal-editor-card">
        <div className="section-head">
          <div>
            <span className="badge">{editingId ? "Edit Proposal" : "New Proposal"}</span>
            <h2>{editingId ? "Update proposal" : "Create professional proposal"}</h2>
            <p className="muted">
              Create, approve, share, and manage client proposals from one workspace.
            </p>
          </div>

          {editingId ? (
            <button className="btn secondary" onClick={resetForm} type="button">
              Cancel Edit
            </button>
          ) : null}
        </div>

        <form className="proposal-editor-form" onSubmit={saveProposal}>
          <div className="proposal-form-grid">
            <label>
              Client
              <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">General proposal</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Proposal title
              <input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </label>

            <label>
              Amount
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Example: 500"
                type="number"
                min="0"
              />
            </label>

            <label>
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
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
            <textarea value={content} onChange={(event) => setContent(event.target.value)} required />
          </label>

          {message ? (
            <p className={message.includes("Unable") ? "auth-error" : "auth-message"}>
              {message}
            </p>
          ) : null}

          <button className="btn gold" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Save Changes" : "Create Proposal"}
          </button>
        </form>
      </section>

      <section className="proposal-list-card">
        <div className="section-head">
          <div>
            <span className="badge">Proposal Library</span>
            <h2>Active proposals</h2>
          </div>
        </div>

        {loading ? <p className="muted">Loading proposals...</p> : null}

        {!loading && proposals.length === 0 ? (
          <div className="empty-state mini">
            <h2>No active proposals</h2>
            <p className="muted">Create your first professional proposal above.</p>
          </div>
        ) : null}

        <div className="proposal-list">
          {proposals.map((proposal) => {
            const shareUrl = getShareUrl(proposal.share_token);
            const messageText = `Hi ${proposal.client_name || "there"}, please review the proposal here: ${shareUrl}`;

            return (
              <article className="proposal-row-card" key={proposal.id}>
                <div>
                  <span className={`proposal-status status-${proposal.status || "draft"}`}>
                    {statusLabel(proposal.status)}
                  </span>
                  <h3>{proposal.title}</h3>
                  <p>
                    {proposal.client_name ? `${proposal.client_name} - ` : ""}
                    {formatDate(proposal.updated_at)}
                  </p>

                  {proposal.sales_user_id ? <p className="muted">Created by sales staff</p> : null}
                  {proposal.amount ? <strong>Amount: {proposal.amount}</strong> : null}

                  {proposal.share_token ? (
                    <p className="muted">Share link ready</p>
                  ) : null}
                </div>

                <div className="proposal-row-actions">
                  {proposal.status === "pending_owner_review" ? (
                    <>
                      <button type="button" onClick={() => updateProposalStatus(proposal, "approved")}>
                        Approve
                      </button>
                      <button type="button" onClick={() => updateProposalStatus(proposal, "changes_requested")}>
                        Request Changes
                      </button>
                    </>
                  ) : null}

                  <a href={`/api/proposal-pdf?id=${proposal.id}`} target="_blank" rel="noreferrer">
                    Export PDF
                  </a>

                  {!proposal.share_token ? (
                    <button type="button" onClick={() => createShareLink(proposal)}>
                      Create Share Link
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={() => copyShareLink(proposal)}>
                        Copy Link
                      </button>

                      <a href={shareUrl} target="_blank" rel="noreferrer">
                        Open Link
                      </a>

                      <a href={`https://wa.me/?text=${encodeURIComponent(messageText)}`} target="_blank" rel="noreferrer">
                        WhatsApp Share
                      </a>

                      <a href={`mailto:?subject=${encodeURIComponent(proposal.title)}&body=${encodeURIComponent(messageText)}`}>
                        Email Share
                      </a>
                    </>
                  )}

                  <button type="button" onClick={() => editProposal(proposal)}>
                    Edit
                  </button>

                  <button type="button" className="danger" onClick={() => moveToRecycle(proposal)}>
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}


