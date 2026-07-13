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
  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  );

  return local
    .toISOString()
    .slice(0, 16);
}

function formatDate(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function calendarDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function googleCalendarLink(
  reminder: Reminder
) {
  const start = new Date(
    reminder.due_at
  );

  const end = new Date(
    start.getTime() +
      30 * 60 * 1000
  );

  const title =
    encodeURIComponent(
      reminder.title
    );

  const details =
    encodeURIComponent(
      `${reminder.notes || ""}\n\nClient: ${
        reminder.client_name ||
        "General"
      }`
    );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${calendarDate(
    start
  )}/${calendarDate(
    end
  )}&details=${details}`;
}

function whatsappLink(
  reminder: Reminder
) {
  const phone = (
    reminder.client_phone || ""
  ).replace(/\D/g, "");

  const text =
    encodeURIComponent(
      `Hi ${
        reminder.client_name || ""
      }, just following up regarding: ${
        reminder.title
      }.`
    );

  if (!phone) {
    return "";
  }

  return `https://wa.me/${phone}?text=${text}`;
}

function isDone(reminder: Reminder) {
  return reminder.status === "done";
}

function isOverdue(reminder: Reminder) {
  if (isDone(reminder)) {
    return false;
  }

  const due = new Date(
    reminder.due_at
  );

  return (
    !Number.isNaN(due.getTime()) &&
    due < new Date()
  );
}

function isDueToday(
  reminder: Reminder
) {
  if (isDone(reminder)) {
    return false;
  }

  const due = new Date(
    reminder.due_at
  );

  const now = new Date();

  return (
    !Number.isNaN(due.getTime()) &&
    due.getFullYear() ===
      now.getFullYear() &&
    due.getMonth() ===
      now.getMonth() &&
    due.getDate() ===
      now.getDate()
  );
}

function priorityLabel(
  value: string
) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

export function ReminderCenter({
  clients
}: ReminderCenterProps) {
  const [reminders, setReminders] =
    useState<Reminder[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [clientId, setClientId] =
    useState("");

  const [title, setTitle] =
    useState("Send proposal");

  const [
    reminderType,
    setReminderType
  ] = useState("proposal");

  const [priority, setPriority] =
    useState("high");

  const [dueAt, setDueAt] =
    useState(
      toDateTimeLocal(
        new Date(
          Date.now() +
            60 * 60 * 1000
        )
      )
    );

  const [notes, setNotes] =
    useState("");

  const selectedClient =
    useMemo(
      () =>
        clients.find(
          (client) =>
            client.id === clientId
        ),
      [clients, clientId]
    );

  const pendingReminders =
    reminders.filter(
      (item) => !isDone(item)
    );

  const doneReminders =
    reminders.filter(isDone);

  const dueTodayReminders =
    reminders.filter(isDueToday);

  const overdueReminders =
    reminders.filter(isOverdue);

  const sortedPending =
    [...pendingReminders].sort(
      (a, b) =>
        new Date(a.due_at).getTime() -
        new Date(b.due_at).getTime()
    );

  const priorityReminder =
    overdueReminders[0] ||
    dueTodayReminders[0] ||
    sortedPending[0] ||
    null;

  async function loadReminders() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/clientpilotai/api/reminders",
        {
          cache: "no-store"
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to load reminders."
        );
        return;
      }

      setReminders(
        data.reminders || []
      );
    } catch {
      setError(
        "Unable to load reminders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReminders();
  }, []);

  async function createReminder(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        "/clientpilotai/api/reminders",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            client_id:
              selectedClient?.id ||
              null,
            client_name:
              selectedClient?.name ||
              null,
            client_phone:
              selectedClient?.phone ||
              null,
            title,
            reminder_type:
              reminderType,
            priority,
            due_at: new Date(
              dueAt
            ).toISOString(),
            notes
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to create reminder."
        );
        return;
      }

      setNotes("");
      await loadReminders();
    } catch {
      setError(
        "Unable to create reminder."
      );
    } finally {
      setSaving(false);
    }
  }

  async function markDone(
    id: string
  ) {
    setError("");

    try {
      const response = await fetch(
        `/clientpilotai/api/reminders/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            status: "done"
          })
        }
      );

      if (!response.ok) {
        const data =
          await response.json();

        setError(
          data.error ||
            "Unable to mark reminder done."
        );
        return;
      }

      await loadReminders();
    } catch {
      setError(
        "Unable to update reminder."
      );
    }
  }

  async function snoozeOneDay(
    reminder: Reminder
  ) {
    setError("");

    const nextDate = new Date(
      reminder.due_at
    );

    nextDate.setDate(
      nextDate.getDate() + 1
    );

    try {
      const response = await fetch(
        `/clientpilotai/api/reminders/${reminder.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            status: "pending",
            due_at:
              nextDate.toISOString()
          })
        }
      );

      if (!response.ok) {
        const data =
          await response.json();

        setError(
          data.error ||
            "Unable to snooze reminder."
        );
        return;
      }

      await loadReminders();
    } catch {
      setError(
        "Unable to snooze reminder."
      );
    }
  }

  return (
    <div className="cp-reminder-center">
      <section className="cp-reminder-overview">
        <div>
          <span className="cp-eyebrow">
            AI Reminder Center
          </span>

          <h2>
            Never miss a client follow-up.
          </h2>

          <p>
            Create proposal, call, WhatsApp,
            email, payment, and meeting
            reminders. Keep every follow-up
            visible and actionable.
          </p>
        </div>

        <div className="cp-reminder-stats-grid">
          <div>
            <span>Pending</span>
            <strong>
              {
                pendingReminders.length
              }
            </strong>
          </div>

          <div>
            <span>Due Today</span>
            <strong>
              {
                dueTodayReminders.length
              }
            </strong>
          </div>

          <div>
            <span>Overdue</span>
            <strong>
              {
                overdueReminders.length
              }
            </strong>
          </div>

          <div>
            <span>Completed</span>
            <strong>
              {
                doneReminders.length
              }
            </strong>
          </div>
        </div>
      </section>

      {error ? (
        <div className="cp-reminder-error">
          {error}
        </div>
      ) : null}

      <div className="cp-reminder-main-grid">
        <section className="cp-reminder-form-card">
          <div className="cp-reminder-card-head">
            <div>
              <span className="cp-eyebrow">
                New Follow-Up
              </span>

              <h3>
                Create reminder
              </h3>

              <p>
                Add one clear action with a
                client, date, priority, and
                communication type.
              </p>
            </div>
          </div>

          <form
            onSubmit={createReminder}
            className="cp-reminder-form"
          >
            <label>
              Client
              <select
                className="cp-select"
                value={clientId}
                onChange={(event) =>
                  setClientId(
                    event.target.value
                  )
                }
              >
                <option value="">
                  General reminder
                </option>

                {clients.map(
                  (client) => (
                    <option
                      key={client.id}
                      value={client.id}
                    >
                      {client.name}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Reminder title
              <input
                className="cp-input"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="Send proposal"
                required
              />
            </label>

            <div className="cp-reminder-form-two">
              <label>
                Type
                <select
                  className="cp-select"
                  value={reminderType}
                  onChange={(event) =>
                    setReminderType(
                      event.target.value
                    )
                  }
                >
                  <option value="proposal">
                    Send proposal
                  </option>
                  <option value="call">
                    Call client
                  </option>
                  <option value="whatsapp">
                    WhatsApp follow-up
                  </option>
                  <option value="email">
                    Email follow-up
                  </option>
                  <option value="payment">
                    Payment follow-up
                  </option>
                  <option value="meeting">
                    Book meeting
                  </option>
                </select>
              </label>

              <label>
                Priority
                <select
                  className="cp-select"
                  value={priority}
                  onChange={(event) =>
                    setPriority(
                      event.target.value
                    )
                  }
                >
                  <option value="high">
                    High
                  </option>
                  <option value="medium">
                    Medium
                  </option>
                  <option value="low">
                    Low
                  </option>
                </select>
              </label>
            </div>

            <label>
              Date and time
              <input
                className="cp-input"
                type="datetime-local"
                value={dueAt}
                onChange={(event) =>
                  setDueAt(
                    event.target.value
                  )
                }
                required
              />
            </label>

            <label>
              Notes
              <textarea
                className="cp-textarea"
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                placeholder="Example: Send proposal and confirm start date."
              />
            </label>

            <button
              className="cp-premium-button cp-button-gold"
              disabled={saving}
              type="submit"
            >
              {saving
                ? "Saving..."
                : "Create Reminder"}
            </button>
          </form>
        </section>

        <section className="cp-reminder-focus-card">
          <span className="cp-eyebrow">
            AI Priority
          </span>

          <h3>
            {priorityReminder
              ? priorityReminder.title
              : "No urgent reminder"}
          </h3>

          <p>
            {priorityReminder
              ? isOverdue(
                  priorityReminder
                )
                ? "This follow-up is overdue and should be completed before lower-priority actions."
                : "This is your most useful next follow-up based on due date."
              : "Your reminder queue is clear."}
          </p>

          {priorityReminder ? (
            <>
              <div className="cp-reminder-focus-meta">
                <span>
                  {
                    priorityReminder.client_name ||
                    "General"
                  }
                </span>

                <span>
                  {formatDate(
                    priorityReminder.due_at
                  )}
                </span>

                <span>
                  {priorityLabel(
                    priorityReminder.priority
                  )}{" "}
                  priority
                </span>
              </div>

              <div className="cp-reminder-focus-actions">
                {whatsappLink(
                  priorityReminder
                ) ? (
                  <a
                    className="cp-premium-button cp-button-gold"
                    href={whatsappLink(
                      priorityReminder
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                ) : null}

                <button
                  className="cp-premium-button cp-button-dark"
                  type="button"
                  onClick={() =>
                    markDone(
                      priorityReminder.id
                    )
                  }
                >
                  Mark Done
                </button>
              </div>
            </>
          ) : null}
        </section>
      </div>

      <section className="cp-reminder-list-card">
        <div className="cp-reminder-list-head">
          <div>
            <span className="cp-eyebrow">
              Reminder Timeline
            </span>

            <h2>
              Upcoming follow-ups
            </h2>

            <p>
              Overdue reminders appear first,
              followed by the next scheduled
              actions.
            </p>
          </div>

          <div className="cp-reminder-count-pill">
            {pendingReminders.length}
            <span>Pending</span>
          </div>
        </div>

        {loading ? (
          <div className="cp-reminder-loading">
            Loading reminders...
          </div>
        ) : null}

        {!loading &&
        reminders.length === 0 ? (
          <div className="cp-reminder-empty">
            <span>🔔</span>
            <h3>
              No reminders yet
            </h3>
            <p>
              Create your first reminder to
              start your follow-up system.
            </p>
          </div>
        ) : null}

        <div className="cp-reminder-list">
          {sortedPending.map(
            (reminder) => {
              const overdue =
                isOverdue(reminder);

              const dueToday =
                isDueToday(reminder);

              return (
                <article
                  key={reminder.id}
                  className={`cp-reminder-item ${
                    overdue
                      ? "cp-reminder-item-overdue"
                      : ""
                  }`}
                >
                  <div className="cp-reminder-icon">
                    {overdue
                      ? "!"
                      : dueToday
                        ? "●"
                        : "↗"}
                  </div>

                  <div className="cp-reminder-content">
                    <div className="cp-reminder-badges">
                      <span
                        className={`cp-reminder-priority cp-reminder-priority-${reminder.priority}`}
                      >
                        {
                          reminder.priority
                        }
                      </span>

                      <span>
                        {reminder.reminder_type.replace(
                          "_",
                          " "
                        )}
                      </span>

                      {overdue ? (
                        <span className="cp-reminder-overdue-badge">
                          Overdue
                        </span>
                      ) : dueToday ? (
                        <span className="cp-reminder-today-badge">
                          Due today
                        </span>
                      ) : null}
                    </div>

                    <h3>
                      {reminder.title}
                    </h3>

                    <p>
                      {reminder.client_name ||
                        "General reminder"}{" "}
                      ·{" "}
                      {formatDate(
                        reminder.due_at
                      )}
                    </p>

                    {reminder.notes ? (
                      <small>
                        {reminder.notes}
                      </small>
                    ) : null}
                  </div>

                  <div className="cp-reminder-actions">
                    <button
                      className="cp-premium-button cp-button-gold"
                      type="button"
                      onClick={() =>
                        markDone(
                          reminder.id
                        )
                      }
                    >
                      Done
                    </button>

                    <button
                      className="cp-premium-button cp-button-soft"
                      type="button"
                      onClick={() =>
                        snoozeOneDay(
                          reminder
                        )
                      }
                    >
                      Snooze 1 Day
                    </button>

                    <a
                      className="cp-premium-button cp-button-soft"
                      href={googleCalendarLink(
                        reminder
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Calendar
                    </a>

                    {whatsappLink(
                      reminder
                    ) ? (
                      <a
                        className="cp-premium-button cp-button-dark"
                        href={whatsappLink(
                          reminder
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            }
          )}
        </div>

        {doneReminders.length > 0 ? (
          <details className="cp-reminder-completed">
            <summary>
              Completed reminders (
              {doneReminders.length})
            </summary>

            <div>
              {doneReminders.map(
                (reminder) => (
                  <article
                    key={reminder.id}
                  >
                    <span>✓</span>

                    <div>
                      <strong>
                        {reminder.title}
                      </strong>

                      <small>
                        {reminder.client_name ||
                          "General"}{" "}
                        ·{" "}
                        {formatDate(
                          reminder.due_at
                        )}
                      </small>
                    </div>

                    <button
                      className="cp-premium-button cp-button-soft"
                      type="button"
                      onClick={() =>
                        snoozeOneDay(
                          reminder
                        )
                      }
                    >
                      Reopen Tomorrow
                    </button>
                  </article>
                )
              )}
            </div>
          </details>
        ) : null}
      </section>
    </div>
  );
}
