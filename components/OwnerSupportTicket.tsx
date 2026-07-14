"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent
} from "react";

type SupportTicket = {
  id: string;
  ticket_number: string;
  account_id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  company_name?: string | null;
  plan: string;
  subject: string;
  category: string;
  priority: string;
  message: string;
  attachment_url?: string | null;
  status: string;
  assigned_to?: string | null;
  owner_notes?: string | null;
  client_last_message_at?: string | null;
  admin_last_reply_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
};

type TicketMessage = {
  id: string;
  ticket_id?: string;
  sender_user_id?: string | null;
  sender_type: "client" | "owner" | "system";
  message: string;
  is_internal: boolean;
  attachment_url?: string | null;
  created_at: string;
  updated_at: string;
  is_initial_message?: boolean;
};

type TicketResponse = {
  ticket: SupportTicket;
  messages: TicketMessage[];
};

type Notice = {
  type: "success" | "error";
  text: string;
};

const STATUS_OPTIONS = [
  ["new", "New"],
  ["open", "Open"],
  ["in_progress", "In progress"],
  ["waiting_for_client", "Waiting for client"],
  ["resolved", "Resolved"],
  ["closed", "Closed"]
];

const PRIORITY_OPTIONS = [
  ["low", "Low"],
  ["normal", "Normal"],
  ["high", "High"],
  ["urgent", "Urgent"]
];

function formatLabel(value: string) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function OwnerSupportTicket({
  ticketId,
  ownerEmail
}: {
  ticketId: string;
  ownerEmail: string;
}) {
  const [ticket, setTicket] =
    useState<SupportTicket | null>(null);

  const [messages, setMessages] = useState<
    TicketMessage[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [savingTicket, setSavingTicket] =
    useState(false);

  const [sendingReply, setSendingReply] =
    useState(false);

  const [savingInternalNote, setSavingInternalNote] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const [status, setStatus] =
    useState("new");

  const [priority, setPriority] =
    useState("normal");

  const [ownerNotes, setOwnerNotes] =
    useState("");

  const [replyMessage, setReplyMessage] =
    useState("");

  const [internalNote, setInternalNote] =
    useState("");

  const loadTicket = useCallback(
    async (
      mode: "load" | "refresh" = "load"
    ) => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setNotice(null);

      try {
        const response = await fetch(
          `/clientpilotai/api/owner/support/${ticketId}`,
          {
            cache: "no-store"
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to load support ticket."
          );
        }

        const data =
          result as TicketResponse;

        setTicket(data.ticket);
        setMessages(data.messages || []);

        setStatus(
          data.ticket.status || "new"
        );

        setPriority(
          data.ticket.priority || "normal"
        );

        setOwnerNotes(
          data.ticket.owner_notes || ""
        );
      } catch (error) {
        setNotice({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Unable to load support ticket."
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [ticketId]
  );

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  async function updateTicket(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSavingTicket(true);
    setNotice(null);

    try {
      const response = await fetch(
        `/clientpilotai/api/owner/support/${ticketId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            status,
            priority,
            owner_notes: ownerNotes
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to update ticket."
        );
      }

      setNotice({
        type: "success",
        text:
          "Ticket settings updated successfully."
      });

      await loadTicket("refresh");
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to update ticket."
      });
    } finally {
      setSavingTicket(false);
    }
  }

  async function submitReply(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const message =
      replyMessage.trim();

    if (!message) {
      setNotice({
        type: "error",
        text:
          "Write a reply before sending."
      });

      return;
    }

    setSendingReply(true);
    setNotice(null);

    try {
      const response = await fetch(
        `/clientpilotai/api/owner/support/${ticketId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message,
            is_internal: false,
            status: "waiting_for_client"
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to send reply."
        );
      }

      setReplyMessage("");

      setNotice({
        type: "success",
        text:
          "Reply sent successfully. Ticket is now waiting for the client."
      });

      await loadTicket("refresh");
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to send reply."
      });
    } finally {
      setSendingReply(false);
    }
  }

  async function submitInternalNote(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const message =
      internalNote.trim();

    if (!message) {
      setNotice({
        type: "error",
        text:
          "Write an internal note before saving."
      });

      return;
    }

    setSavingInternalNote(true);
    setNotice(null);

    try {
      const response = await fetch(
        `/clientpilotai/api/owner/support/${ticketId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message,
            is_internal: true
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to save internal note."
        );
      }

      setInternalNote("");

      setNotice({
        type: "success",
        text:
          "Private internal note saved successfully."
      });

      await loadTicket("refresh");
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to save internal note."
      });
    } finally {
      setSavingInternalNote(false);
    }
  }

  async function quickStatusChange(
    nextStatus: string
  ) {
    setSavingTicket(true);
    setNotice(null);

    try {
      const response = await fetch(
        `/clientpilotai/api/owner/support/${ticketId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            status: nextStatus
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to update ticket status."
        );
      }

      setStatus(nextStatus);

      setNotice({
        type: "success",
        text: `Ticket marked as ${formatLabel(
          nextStatus
        )}.`
      });

      await loadTicket("refresh");
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to update ticket status."
      });
    } finally {
      setSavingTicket(false);
    }
  }

  if (loading && !ticket) {
    return (
      <div className="cp-owner-support-page">
        <div className="cp-owner-support-loading">
          Loading support ticket...
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="cp-owner-support-page">
        {notice ? (
          <div className="cp-owner-notice cp-owner-notice-error">
            <span>!</span>
            <p>{notice.text}</p>
          </div>
        ) : null}

        <Link
          className="cp-owner-support-back"
          href="/dashboard/owner/support"
        >
          Return to Client Issues
        </Link>
      </div>
    );
  }

  return (
    <div className="cp-owner-support-page">
      <section className="cp-owner-ticket-hero">
        <div>
          <Link
            className="cp-owner-ticket-back"
            href="/dashboard/owner/support"
          >
            ← Client Issues
          </Link>

          <span className="cp-owner-eyebrow">
            Makzora Support Ticket
          </span>

          <h1>{ticket.ticket_number}</h1>

          <p>{ticket.subject}</p>

          <div className="cp-owner-support-meta">
            <span>
              Owner: {ownerEmail}
            </span>

            <span>
              Created:{" "}
              {formatDate(ticket.created_at)}
            </span>
          </div>
        </div>

        <div className="cp-owner-ticket-hero-status">
          <span
            className={`cp-owner-support-badge cp-owner-support-priority-${ticket.priority}`}
          >
            {formatLabel(ticket.priority)}
          </span>

          <span
            className={`cp-owner-support-badge cp-owner-support-status-${ticket.status}`}
          >
            {formatLabel(ticket.status)}
          </span>

          <button
            type="button"
            onClick={() =>
              void loadTicket("refresh")
            }
            disabled={refreshing}
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh Ticket"}
          </button>
        </div>
      </section>

      {notice ? (
        <div
          className={`cp-owner-notice cp-owner-notice-${notice.type}`}
        >
          <span>
            {notice.type === "success"
              ? "OK"
              : "!"}
          </span>

          <p>{notice.text}</p>

          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="cp-owner-ticket-grid">
        <div className="cp-owner-ticket-main">
          <section className="cp-owner-card">
            <div className="cp-owner-card-head">
              <div>
                <span>Conversation</span>
                <h2>Client and Makzora messages</h2>
              </div>

              <strong>
                {messages.length} messages
              </strong>
            </div>

            <div className="cp-owner-ticket-conversation">
              {messages.map((message) => (
                <article
                  className={[
                    "cp-owner-ticket-message",
                    `cp-owner-ticket-message-${message.sender_type}`,
                    message.is_internal
                      ? "cp-owner-ticket-message-internal"
                      : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={message.id}
                >
                  <div className="cp-owner-ticket-message-head">
                    <div>
                      <strong>
                        {message.is_internal
                          ? "Private Makzora Note"
                          : message.sender_type ===
                              "owner"
                            ? "Makzora Support"
                            : ticket.customer_name}
                      </strong>

                      <span>
                        {message.is_internal
                          ? "Internal only"
                          : formatLabel(
                              message.sender_type
                            )}
                      </span>
                    </div>

                    <time>
                      {formatDate(
                        message.created_at
                      )}
                    </time>
                  </div>

                  <p>{message.message}</p>

                  {message.attachment_url ? (
                    <div className="cp-owner-ticket-attachment">
                      Attachment saved with this
                      message
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="cp-owner-card">
            <div className="cp-owner-card-head">
              <div>
                <span>Customer response</span>
                <h2>Reply to client</h2>
              </div>
            </div>

            <form
              className="cp-owner-ticket-form"
              onSubmit={submitReply}
            >
              <textarea
                value={replyMessage}
                onChange={(event) =>
                  setReplyMessage(
                    event.target.value
                  )
                }
                placeholder="Write a clear response for the customer..."
                maxLength={10000}
                required
              />

              <div className="cp-owner-ticket-form-footer">
                <small>
                  The customer will be able to see
                  this reply.
                </small>

                <button
                  type="submit"
                  disabled={sendingReply}
                >
                  {sendingReply
                    ? "Sending Reply..."
                    : "Send Reply"}
                </button>
              </div>
            </form>
          </section>

          <section className="cp-owner-card cp-owner-ticket-internal-card">
            <div className="cp-owner-card-head">
              <div>
                <span>Private Makzora workspace</span>
                <h2>Add internal note</h2>
              </div>

              <strong>Not visible to client</strong>
            </div>

            <form
              className="cp-owner-ticket-form"
              onSubmit={submitInternalNote}
            >
              <textarea
                value={internalNote}
                onChange={(event) =>
                  setInternalNote(
                    event.target.value
                  )
                }
                placeholder="Add investigation notes, payment details or internal instructions..."
                maxLength={10000}
                required
              />

              <div className="cp-owner-ticket-form-footer">
                <small>
                  Only authorized Makzora owners can
                  read this note.
                </small>

                <button
                  type="submit"
                  disabled={savingInternalNote}
                >
                  {savingInternalNote
                    ? "Saving Note..."
                    : "Save Internal Note"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="cp-owner-ticket-sidebar">
          <section className="cp-owner-card">
            <div className="cp-owner-card-head">
              <div>
                <span>Customer information</span>
                <h2>Account details</h2>
              </div>
            </div>

            <div className="cp-owner-ticket-details">
              <div>
                <span>Customer</span>
                <strong>
                  {ticket.customer_name}
                </strong>
              </div>

              <div>
                <span>Email</span>
                <strong>
                  {ticket.customer_email}
                </strong>
              </div>

              <div>
                <span>Company</span>
                <strong>
                  {ticket.company_name ||
                    "Not provided"}
                </strong>
              </div>

              <div>
                <span>Current plan</span>
                <strong>
                  {formatLabel(ticket.plan)}
                </strong>
              </div>

              <div>
                <span>Category</span>
                <strong>
                  {formatLabel(
                    ticket.category
                  )}
                </strong>
              </div>

              <div>
                <span>Account ID</span>
                <small>
                  {ticket.account_id}
                </small>
              </div>

              <div>
                <span>Last updated</span>
                <strong>
                  {formatDate(
                    ticket.updated_at
                  )}
                </strong>
              </div>
            </div>
          </section>

          <section className="cp-owner-card">
            <div className="cp-owner-card-head">
              <div>
                <span>Ticket management</span>
                <h2>Status and priority</h2>
              </div>
            </div>

            <form
              className="cp-owner-ticket-settings"
              onSubmit={updateTicket}
            >
              <label>
                <span>Status</span>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value
                    )
                  }
                >
                  {STATUS_OPTIONS.map(
                    ([value, label]) => (
                      <option
                        value={value}
                        key={value}
                      >
                        {label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span>Priority</span>

                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(
                      event.target.value
                    )
                  }
                >
                  {PRIORITY_OPTIONS.map(
                    ([value, label]) => (
                      <option
                        value={value}
                        key={value}
                      >
                        {label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span>Owner summary notes</span>

                <textarea
                  value={ownerNotes}
                  onChange={(event) =>
                    setOwnerNotes(
                      event.target.value
                    )
                  }
                  placeholder="Private summary about this case"
                  maxLength={10000}
                />
              </label>

              <button
                type="submit"
                disabled={savingTicket}
              >
                {savingTicket
                  ? "Saving Changes..."
                  : "Save Ticket Changes"}
              </button>
            </form>
          </section>

          <section className="cp-owner-card">
            <div className="cp-owner-card-head">
              <div>
                <span>Quick actions</span>
                <h2>Complete the ticket</h2>
              </div>
            </div>

            <div className="cp-owner-ticket-quick-actions">
              <button
                type="button"
                onClick={() =>
                  void quickStatusChange(
                    "in_progress"
                  )
                }
                disabled={savingTicket}
              >
                Mark In Progress
              </button>

              <button
                type="button"
                className="resolve"
                onClick={() =>
                  void quickStatusChange(
                    "resolved"
                  )
                }
                disabled={savingTicket}
              >
                Mark Resolved
              </button>

              <button
                type="button"
                className="close"
                onClick={() =>
                  void quickStatusChange(
                    "closed"
                  )
                }
                disabled={savingTicket}
              >
                Close Ticket
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
