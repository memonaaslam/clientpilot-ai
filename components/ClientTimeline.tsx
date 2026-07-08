"use client";

import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

type TimelineEvent = {
  id: string;
  type: string;
  label: string;
  title: string;
  status?: string | null;
  date: string;
  description?: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function ClientTimeline() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTimeline(id?: string) {
    setLoading(true);
    setError("");

    try {
      const query = id ? `?client_id=${encodeURIComponent(id)}` : "";
      const response = await fetch(`/api/client-timeline${query}`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to load timeline.");
        return;
      }

      setClients(data.clients || []);
      setSelectedClient(data.selectedClient || null);
      setTimeline(data.timeline || []);

      if (!clientId && data.selectedClient?.id) {
        setClientId(data.selectedClient.id);
      }
    } catch {
      setError("Unable to load timeline.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTimeline();
  }, []);

  function changeClient(id: string) {
    setClientId(id);
    loadTimeline(id);
  }

  return (
    <div className="client-timeline-page">
      <div className="page-hero client-timeline-hero">
        <div>
          <span className="badge">Client Timeline</span>
          <h1 style={{ fontSize: 48 }}>See every client action in one place</h1>
          <p className="muted">
            Track client history from first contact to meetings, tasks, reminders,
            proposals, and follow-ups.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>{timeline.length}</strong>
          <span>Timeline events</span>
        </div>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}

      <section className="client-timeline-grid">
        <aside className="client-timeline-selector">
          <h2>Select client</h2>

          {loading ? <p className="muted">Loading clients...</p> : null}

          <select value={clientId} onChange={(event) => changeClient(event.target.value)}>
            {clients.map((client) => (
              <option value={client.id} key={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          {selectedClient ? (
            <div className="client-profile-card">
              <span>Client profile</span>
              <h3>{selectedClient.name}</h3>
              <p>{selectedClient.phone || "No phone"}</p>
              <p>{selectedClient.email || "No email"}</p>
              <p>{selectedClient.address || "No address"}</p>
            </div>
          ) : null}
        </aside>

        <section className="client-timeline-card">
          <div className="client-timeline-head">
            <h2>Activity history</h2>
            <p>{selectedClient ? selectedClient.name : "Select a client"}</p>
          </div>

          {!loading && timeline.length === 0 ? (
            <div className="empty-state mini">
              <h2>No timeline yet</h2>
              <p className="muted">Add meetings, reminders, tasks, or proposals for this client.</p>
            </div>
          ) : null}

          <div className="timeline-list">
            {timeline.map((event) => (
              <article className={`timeline-event ${event.type}`} key={event.id}>
                <div className="timeline-dot">{event.type.slice(0, 1).toUpperCase()}</div>

                <div className="timeline-content">
                  <div className="timeline-meta">
                    <span>{event.label}</span>
                    <small>{formatDate(event.date)}</small>
                  </div>

                  <h3>{event.title}</h3>

                  {event.status ? <b>{event.status}</b> : null}

                  {event.description ? <p>{event.description}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
