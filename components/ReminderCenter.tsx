"use client";

import { useEffect, useMemo, useState } from "react";

type ClientOption = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

type Reminder = {
  id: string;
  client_id?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  title: string;
  reminder_type: string;
  priority: string;
  status: string;
  due_at: string;
  notes?: string | null;
};

type ReminderCenterProps = {
  clients: ClientOption[];
};

function toDateTimeLocal(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateValue));
}

function calendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function googleCalendarLink(reminder: Reminder) {
  const start = new Date(reminder.due_at);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const title = encodeURIComponent(reminder.title);
  const details = encodeURIComponent(
    `${reminder.notes || ""}\n\nClient: ${reminder.client_name || "General"}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${calendarDate(start)}/${calendarDate(end)}&details=${details}`;
}

function whatsappLink(reminder: Reminder) {
  const phone = (reminder.client_phone || "").replace(/\D/g, "");
  const text = encodeURIComponent(
    `Hi ${reminder.client_name || ""}, just following up regarding: ${reminder.title}.`
  );

  if (!phone) return "";

  return `https://wa.me/${phone}?text=${text}`;
}

export function ReminderCenter({ clients }: ReminderCenterProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("Send proposal");
  const [reminderType, setReminderType] = useState("proposal");
  const [priority, setPriority] = useState("high");
  const [dueAt, setDueAt] = useState(toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
  const [notes, setNotes] = useState("");

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId),
    [clients, clientId]
  );

  const pendingCount = reminders.filter((item) => item.status !== "done").length;
  const dueTodayCount = reminders.filter((item) => {
    const date = new Date(item.due_at);
    const now = new Date();
    return (
      item.status !== "done" &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }).length;

  async function loadReminders() {
    setLoading(true);

    try {
      const response = await fetch("/clientpilotai/api/reminders", { cache: "no-store" });
      const data = await response.json();
      setReminders(data.reminders || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReminders();
  }, []);

  async function createReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await fetch("/clientpilotai/api/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: selectedClient?.id || null,
          client_name: selectedClient?.name || null,
          client_phone: selectedClient?.phone || null,
          title,
          reminder_type: reminderType,
          priority,
          due_at: new Date(dueAt).toISOString(),
          notes
        })
      });

      setNotes("");
      await loadReminders();
    } finally {
      setSaving(false);
    }
  }

  async function markDone(id: string) {
    await fetch(`/clientpilotai/api/reminders/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: "done" })
    });

    await loadReminders();
  }

  async function snoozeOneDay(reminder: Reminder) {
    const nextDate = new Date(reminder.due_at);
    nextDate.setDate(nextDate.getDate() + 1);

    await fetch(`/clientpilotai/api/reminders/${reminder.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: "pending",
        due_at: nextDate.toISOString()
      })
    });

    await loadReminders();
  }

  return (
    <div className="reminder-layout">
      <section className="reminder-hero-card">
        <div>
          <span className="badge">Follow-Up Autopilot</span>
          <h2>Never miss a client follow-up.</h2>
          <p>
            Create proposal, call, WhatsApp, payment, and meeting reminders. Add them to
            Google Calendar and mark them done when completed.
          </p>
        </div>

        <div className="reminder-stats">
          <div>
            <strong>{pendingCount}</strong>
            <span>Pending</span>
          </div>

          <div>
            <strong>{dueTodayCount}</strong>
            <span>Due today</span>
          </div>
        </div>
      </section>

      <section className="reminder-form-card">
        <h3>Create reminder</h3>

        <form onSubmit={createReminder} className="reminder-form">
          <label>
            Client
            <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
              <option value="">General reminder</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Reminder title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Send proposal"
              required
            />
          </label>

          <div className="reminder-two">
            <label>
              Type
              <select
                value={reminderType}
                onChange={(event) => setReminderType(event.target.value)}
              >
                <option value="proposal">Send proposal</option>
                <option value="call">Call client</option>
                <option value="whatsapp">WhatsApp follow-up</option>
                <option value="email">Email follow-up</option>
                <option value="payment">Payment follow-up</option>
                <option value="meeting">Book meeting</option>
              </select>
            </label>

            <label>
              Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          </div>

          <label>
            Date and time
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              required
            />
          </label>

          <label>
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Example: Send proposal and confirm start date."
            />
          </label>

          <button className="btn gold" disabled={saving}>
            {saving ? "Saving..." : "Create Reminder"}
          </button>
        </form>
      </section>

      <section className="reminder-list-card">
        <div className="section-head">
          <div>
            <span className="badge">Reminder Center</span>
            <h3>Upcoming follow-ups</h3>
          </div>
        </div>

        {loading ? <p className="muted">Loading reminders...</p> : null}

        {!loading && reminders.length === 0 ? (
          <div className="empty-state mini">
            <h2>No reminders yet</h2>
            <p className="muted">Create your first reminder to start your follow-up system.</p>
          </div>
        ) : null}

        <div className="reminder-list">
          {reminders.map((reminder) => (
            <article
              key={reminder.id}
              className={`reminder-item ${reminder.status === "done" ? "done" : ""}`}
            >
              <div>
                <div className="reminder-topline">
                  <span className={`priority ${reminder.priority}`}>{reminder.priority}</span>
                  <span>{reminder.reminder_type.replace("_", " ")}</span>
                  <span>{reminder.status}</span>
                </div>

                <h4>{reminder.title}</h4>

                <p>
                  {reminder.client_name ? `${reminder.client_name} Â· ` : ""}
                  {formatDate(reminder.due_at)}
                </p>

                {reminder.notes ? <p className="muted">{reminder.notes}</p> : null}
              </div>

              <div className="reminder-actions">
                {reminder.status !== "done" ? (
                  <button onClick={() => markDone(reminder.id)}>Done</button>
                ) : null}

                <button onClick={() => snoozeOneDay(reminder)}>Snooze 1 day</button>

                <a href={googleCalendarLink(reminder)} target="_blank">
                  Google Calendar
                </a>

                {whatsappLink(reminder) ? (
                  <a href={whatsappLink(reminder)} target="_blank">
                    WhatsApp
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}