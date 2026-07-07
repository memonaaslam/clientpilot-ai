"use client";

import { useState } from "react";
import Link from "next/link";

type ClientOption = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

type SmartMeetingUploadProps = {
  clients: ClientOption[];
};

function suggestedDate(daysFromNow: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export function SmartMeetingUpload({ clients }: SmartMeetingUploadProps) {
  const [title, setTitle] = useState("Client meeting");
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [reminderSaving, setReminderSaving] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const selectedClient = clients.find((client) => client.id === clientId);

  async function submitMeeting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");
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

  async function createSuggestedReminder(
    key: string,
    reminderTitle: string,
    type: string,
    dueAt: string,
    priority: string
  ) {
    setReminderSaving(key);
    setMessage("");

    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: selectedClient?.id || null,
          client_name: selectedClient?.name || null,
          client_phone: selectedClient?.phone || null,
          title: reminderTitle,
          reminder_type: type,
          priority,
          due_at: dueAt,
          notes: `Created from meeting: ${title}`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to create reminder.");
        return;
      }

      setMessage("Reminder added successfully.");
    } finally {
      setReminderSaving("");
    }
  }

  return (
    <div className="smart-upload-layout">
      <section className="smart-upload-card">
        <div className="smart-upload-head">
          <span className="badge">Free Smart Mode</span>
          <h2>Process meeting notes</h2>
          <p>
            Paste meeting notes and ClientPilot will create a smart summary, action list,
            proposal points, and follow-up reminders.
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
              placeholder="Example: Client wants social media management. Budget is $500 per month. Needs proposal today. Follow up tomorrow on WhatsApp."
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
          <span>Action items and proposal points</span>
        </div>

        <div className="smart-preview-step">
          <strong>03</strong>
          <span>Follow-up reminders</span>
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

          <div className="autopilot-reminder-box">
            <div>
              <span className="badge">Suggested Reminders</span>
              <h4>Follow-Up Autopilot</h4>
              <p className="muted">
                Add these reminders so you do not forget proposal, WhatsApp, or call follow-up.
              </p>
            </div>

            <div className="suggested-reminders">
              <button
                onClick={() =>
                  createSuggestedReminder(
                    "proposal",
                    "Send proposal",
                    "proposal",
                    suggestedDate(0, 17),
                    "high"
                  )
                }
              >
                {reminderSaving === "proposal" ? "Adding..." : "Send proposal today"}
              </button>

              <button
                onClick={() =>
                  createSuggestedReminder(
                    "whatsapp",
                    "WhatsApp follow-up",
                    "whatsapp",
                    suggestedDate(1, 10),
                    "medium"
                  )
                }
              >
                {reminderSaving === "whatsapp" ? "Adding..." : "Follow up tomorrow"}
              </button>

              <button
                onClick={() =>
                  createSuggestedReminder(
                    "call",
                    "Call client",
                    "call",
                    suggestedDate(2, 11),
                    "medium"
                  )
                }
              >
                {reminderSaving === "call" ? "Adding..." : "Call after 2 days"}
              </button>
            </div>

            {message ? <p className="auth-message">{message}</p> : null}

            <Link className="btn secondary" href="/dashboard/reminders">
              Open Reminder Center
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}