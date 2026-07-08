"use client";

import { useEffect, useMemo, useState } from "react";

type Client = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

type GeneratedFollowUp = {
  subject: string;
  message: string;
  whatsappUrl: string;
  mailtoUrl: string;
};

export function FollowUpAssistant() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState("whatsapp");
  const [purpose, setPurpose] = useState("proposal");
  const [tone, setTone] = useState("friendly");
  const [notes, setNotes] = useState("");
  const [generated, setGenerated] = useState<GeneratedFollowUp | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId),
    [clients, clientId]
  );

  async function loadClients() {
    setLoading(true);

    try {
      const response = await fetch("/api/follow-up-assistant", { cache: "no-store" });
      const data = await response.json();

      setClients(data.clients || []);

      if (data.clients?.[0]?.id) {
        setClientId(data.clients[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function generateFollowUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setGenerating(true);
    setGenerated(null);
    setMessage("");

    try {
      const response = await fetch("/api/follow-up-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: clientId,
          type,
          purpose,
          tone,
          notes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to generate follow-up.");
        return;
      }

      setGenerated({
        subject: data.subject || "",
        message: data.message || "",
        whatsappUrl: data.whatsappUrl || "",
        mailtoUrl: data.mailtoUrl || ""
      });
    } finally {
      setGenerating(false);
    }
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setMessage("Copied successfully.");
  }

  return (
    <div className="followup-page">
      <div className="page-hero followup-hero">
        <div>
          <span className="badge">One-click follow-up</span>
          <h1 style={{ fontSize: 48 }}>Generate WhatsApp and email follow-ups</h1>
          <p className="muted">
            ClientPilot prepares professional follow-up messages so your team can act faster without writing from zero.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>{clients.length}</strong>
          <span>Clients ready</span>
        </div>
      </div>

      {message ? <p className={message.includes("Unable") ? "auth-error" : "auth-message"}>{message}</p> : null}

      <div className="followup-grid">
        <section className="followup-card">
          <h2>Create follow-up</h2>

          {loading ? <p className="muted">Loading clients...</p> : null}

          <form onSubmit={generateFollowUp} className="followup-form">
            <label>
              Client
              <select value={clientId} onChange={(event) => setClientId(event.target.value)} required>
                {clients.map((client) => (
                  <option value={client.id} key={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Follow-up type
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </label>

            <label>
              Purpose
              <select value={purpose} onChange={(event) => setPurpose(event.target.value)}>
                <option value="proposal">Proposal follow-up</option>
                <option value="meeting">After meeting</option>
                <option value="payment">Payment follow-up</option>
                <option value="cold-lead">Lost lead rescue</option>
                <option value="general">General follow-up</option>
              </select>
            </label>

            <label>
              Tone
              <select value={tone} onChange={(event) => setTone(event.target.value)}>
                <option value="friendly">Friendly</option>
                <option value="premium">Premium professional</option>
              </select>
            </label>

            <label>
              Extra notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>

            <button disabled={generating || clients.length === 0}>
              {generating ? "Generating..." : "Generate Follow-up"}
            </button>
          </form>
        </section>

        <section className="followup-card followup-output">
          <div className="followup-output-head">
            <div>
              <h2>Ready-to-send message</h2>
              <p>
                {selectedClient
                  ? `${selectedClient.name} · ${selectedClient.phone || "No phone"} · ${selectedClient.email || "No email"}`
                  : "Select client first"}
              </p>
            </div>
          </div>

          {!generated ? (
            <div className="empty-state mini">
              <h2>No message yet</h2>
              <p className="muted">Generate a follow-up to preview it here.</p>
            </div>
          ) : null}

          {generated ? (
            <div className="followup-preview">
              {generated.subject ? (
                <div>
                  <span>Subject</span>
                  <strong>{generated.subject}</strong>
                </div>
              ) : null}

              <div>
                <span>Message</span>
                <pre>{generated.message}</pre>
              </div>

              <div className="followup-actions">
                <button onClick={() => copyText(generated.message)}>Copy Message</button>

                {generated.whatsappUrl ? (
                  <a href={generated.whatsappUrl} target="_blank" rel="noreferrer">
                    Open WhatsApp
                  </a>
                ) : null}

                {generated.mailtoUrl ? (
                  <a href={generated.mailtoUrl}>
                    Open Email Draft
                  </a>
                ) : null}

                {generated.subject ? (
                  <button onClick={() => copyText(`Subject: ${generated.subject}\n\n${generated.message}`)}>
                    Copy Email
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
