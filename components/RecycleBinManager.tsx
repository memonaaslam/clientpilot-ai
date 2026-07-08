"use client";

import { useEffect, useState } from "react";

type Proposal = {
  id: string;
  title: string;
  client_name?: string | null;
  deleted_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Recently deleted";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function RecycleBinManager() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDeleted() {
    setLoading(true);

    try {
      const response = await fetch("/api/proposals?recycle=true", { cache: "no-store" });
      const data = await response.json();
      setProposals(data.proposals || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeleted();
  }, []);

  async function recoverProposal(id: string) {
    await fetch(`/api/proposals/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ deleted: false })
    });

    await loadDeleted();
  }

  async function deletePermanently(id: string) {
    const confirmDelete = window.confirm(
      "This will permanently delete the proposal. This cannot be recovered. Continue?"
    );

    if (!confirmDelete) return;

    await fetch(`/api/proposals/${id}?permanent=true`, {
      method: "DELETE"
    });

    await loadDeleted();
  }

  return (
    <section className="recycle-card">
      <div className="section-head">
        <div>
          <span className="badge">Recycle Bin</span>
          <h2>Deleted proposals</h2>
          <p className="muted">Recover proposals or delete them permanently.</p>
        </div>
      </div>

      {loading ? <p className="muted">Loading deleted proposals...</p> : null}

      {!loading && proposals.length === 0 ? (
        <div className="empty-state mini">
          <h2>Recycle Bin is empty</h2>
          <p className="muted">Deleted proposals will appear here.</p>
        </div>
      ) : null}

      <div className="recycle-list">
        {proposals.map((proposal) => (
          <article className="recycle-item" key={proposal.id}>
            <div>
              <h3>{proposal.title}</h3>
              <p>
                {proposal.client_name ? `${proposal.client_name} · ` : ""}
                Deleted {formatDate(proposal.deleted_at)}
              </p>
            </div>

            <div className="recycle-actions">
              <button onClick={() => recoverProposal(proposal.id)}>Recover</button>
              <button className="danger" onClick={() => deletePermanently(proposal.id)}>
                Delete Permanently
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}