"use client";

import { useState } from "react";

type LostLead = {
  id: string;
  name: string;
  phone?: string | null;
  daysSilent: number;
  lastActivity: string;
  reason: string;
};

type LostLeadRescuePanelProps = {
  leads: LostLead[];
};

function tomorrowAt10() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

function whatsappLink(phone?: string | null, name?: string) {
  const cleaned = (phone || "").replace(/\D/g, "");

  if (!cleaned) return "";

  const text = encodeURIComponent(
    `Hi ${name || ""}, just following up regarding our previous discussion. Please let me know if you would like me to send the next details or proposal.`
  );

  return `https://wa.me/${cleaned}?text=${text}`;
}

export function LostLeadRescuePanel({ leads }: LostLeadRescuePanelProps) {
  const [savingId, setSavingId] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  async function createRescueReminder(lead: LostLead) {
    setSavingId(lead.id);
    setMessage("");

    try {
      const response = await fetch("/clientpilotai/api/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: lead.id,
          client_name: lead.name,
          client_phone: lead.phone || null,
          title: `Rescue follow-up: ${lead.name}`,
          reminder_type: "follow_up",
          priority: lead.daysSilent >= 7 ? "high" : "medium",
          due_at: tomorrowAt10(),
          notes: `Auto-created from Lost Lead Rescue. Client has been silent for ${lead.daysSilent} days.`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to create reminder.");
        return;
      }

      setSavedIds((current) => [...current, lead.id]);
      setMessage("Rescue reminder created.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <section className="lost-lead-card">
      <div className="section-head">
        <div>
          <span className="badge">Lost Lead Rescue</span>
          <h2>Clients going cold</h2>
          <p className="muted">
            These clients have no recent activity or pending reminder. Create a rescue follow-up before they forget you.
          </p>
        </div>
      </div>

      {message ? <p className="auth-message">{message}</p> : null}

      {leads.length === 0 ? (
        <div className="empty-state mini">
          <h2>No cold leads found</h2>
          <p className="muted">Good. Your clients currently have recent activity or follow-up reminders.</p>
        </div>
      ) : (
        <div className="lost-lead-list">
          {leads.map((lead) => {
            const wa = whatsappLink(lead.phone, lead.name);
            const alreadySaved = savedIds.includes(lead.id);

            return (
              <article className="lost-lead-item" key={lead.id}>
                <div>
                  <span className={lead.daysSilent >= 7 ? "lead-risk high" : "lead-risk medium"}>
                    {lead.daysSilent >= 7 ? "High risk" : "Needs follow-up"}
                  </span>

                  <h3>{lead.name}</h3>

                  <p>
                    Silent for {lead.daysSilent} days Â· {lead.reason}
                  </p>

                  <small>Last activity: {lead.lastActivity}</small>
                </div>

                <div className="lost-lead-actions">
                  <button
                    type="button"
                    disabled={savingId === lead.id || alreadySaved}
                    onClick={() => createRescueReminder(lead)}
                  >
                    {alreadySaved ? "Reminder Added" : savingId === lead.id ? "Adding..." : "Create Rescue Reminder"}
                  </button>

                  {wa ? (
                    <a href={wa} target="_blank">
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}