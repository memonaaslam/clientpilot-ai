"use client";

import { useState } from "react";

type ClientProposalActionsProps = {
  token: string;
  currentStatus?: string | null;
};

export function ClientProposalActions({ token, currentStatus }: ClientProposalActionsProps) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState(currentStatus || "");
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");

  async function respond(action: "accepted" | "changes_requested") {
    setLoading(action);
    setMessage("");

    try {
      const response = await fetch("/api/public-proposal-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          action,
          note
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to submit response.");
        return;
      }

      setStatus(data.proposal.status);
      setMessage(
        action === "accepted"
          ? "Proposal accepted successfully."
          : "Your change request has been sent."
      );
    } finally {
      setLoading("");
    }
  }

  const alreadyAccepted = status === "accepted";

  return (
    <section className="client-proposal-actions">
      <div>
        <span>Client Response</span>
        <h2>{alreadyAccepted ? "Proposal accepted" : "Ready to proceed?"}</h2>
        <p>
          Accept the proposal or request changes. Your response will update the owner workspace automatically.
        </p>
      </div>

      {!alreadyAccepted ? (
        <>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note, changes, or questions..."
          />

          <div className="client-proposal-action-buttons">
            <button
              type="button"
              onClick={() => respond("accepted")}
              disabled={Boolean(loading)}
            >
              {loading === "accepted" ? "Accepting..." : "Accept Proposal"}
            </button>

            <button
              type="button"
              className="secondary"
              onClick={() => respond("changes_requested")}
              disabled={Boolean(loading)}
            >
              {loading === "changes_requested" ? "Sending..." : "Request Changes"}
            </button>
          </div>
        </>
      ) : null}

      {message ? <p className="client-response-message">{message}</p> : null}
    </section>
  );
}
