"use client";

import { useState } from "react";
import Link from "next/link";

type ClientOption = {
  id: string;
  name: string;
};

type SmartMeetingUploadProps = {
  clients: ClientOption[];
};

export function SmartMeetingUpload({ clients }: SmartMeetingUploadProps) {
  const [title, setTitle] = useState("Client meeting");
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  async function submitMeeting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("clientId", clientId);
      formData.set("notes", notes);

      const response = await fetch("/api/ai/transcribe", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to process meeting.");
        return;
      }

      setResult(data);
      setNotes("");
    } catch {
      setError("Unable to process meeting. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="smart-upload-layout">
      <section className="smart-upload-card">
        <div className="smart-upload-head">
          <span className="badge">Free Smart Mode</span>
          <h2>Process meeting notes</h2>
          <p>
            Paste meeting notes and ClientPilot AI will create a smart summary, action list,
            follow-up direction, and proposal points without using paid AI APIs.
          </p>
        </div>

        <form className="smart-upload-form" onSubmit={submitMeeting}>
          <label>
            Meeting title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Client meeting"
              required
            />
          </label>

          <label>
            Client
            <select
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              required
            >
              {clients.length === 0 ? (
                <option value="">No clients found</option>
              ) : (
                clients.map((client) => (
                  <option value={client.id} key={client.id}>
                    {client.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <label>
            Meeting notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Example: Client wants social media management. Budget is around $500/month. Needs proposal today. Follow up tomorrow on WhatsApp..."
              required
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button className="btn gold" type="submit" disabled={loading || clients.length === 0}>
            {loading ? "Processing..." : "Create Smart Summary + Follow-Up"}
          </button>
        </form>
      </section>

      <aside className="smart-upload-preview">
        <h3>What this creates</h3>

        <div className="smart-preview-step">
          <strong>01</strong>
          <span>Smart meeting summary</span>
        </div>

        <div className="smart-preview-step">
          <strong>02</strong>
          <span>Action items and next steps</span>
        </div>

        <div className="smart-preview-step">
          <strong>03</strong>
          <span>Proposal points for client follow-up</span>
        </div>

        <div className="smart-preview-note">
          Audio transcription is AI-ready for later. For now, this mode keeps your running cost free.
        </div>
      </aside>

      {result ? (
        <section className="smart-result-card">
          <div className="section-head">
            <div>
              <span className="badge">Created</span>
              <h3>Meeting saved successfully</h3>
              <p className="muted">
                Usage: {result.usage}/{result.limit} meetings this month.
              </p>
            </div>

            <Link className="btn secondary" href="/dashboard/meetings">
              View Meetings
            </Link>
          </div>

          <pre>{result.summary}</pre>

          <h4>Action Items</h4>
          <ul>
            {(result.actionItems || []).map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}