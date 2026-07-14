"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";

import {
  createSupabaseBrowserClient
} from "@/lib/supabase-browser";

type TicketRow = {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  plan: string;
  company_name?: string | null;
  client_last_message_at?: string | null;
  admin_last_reply_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
};

type Notice = {
  type: "success" | "error";
  text: string;
};

const CATEGORIES = [
  ["login_issue", "Login issue"],
  ["subscription_issue", "Subscription issue"],
  ["payment_issue", "Payment issue"],
  ["meeting_upload_issue", "Meeting upload issue"],
  ["transcription_issue", "Transcription issue"],
  ["proposal_issue", "Proposal issue"],
  ["task_issue", "Task issue"],
  ["reminder_issue", "Reminder issue"],
  ["account_issue", "Account issue"],
  ["feature_request", "Feature request"],
  ["other", "Other"]
];

const PRIORITIES = [
  ["low", "Low"],
  ["normal", "Normal"],
  ["high", "High"],
  ["urgent", "Urgent"]
];

const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

function createSafeFileName(
  originalName: string
) {
  const cleanedName = originalName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-120);

  return cleanedName || "attachment";
}

export function ClientSupportCenter({
  initialEmail
}: {
  initialEmail: string;
}) {
  const supabase = useMemo(
    () => createSupabaseBrowserClient(),
    []
  );

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [tickets, setTickets] = useState<
    TicketRow[]
  >([]);

  const [accountEmail, setAccountEmail] =
    useState(initialEmail);

  const [userId, setUserId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [form, setForm] = useState({
    name: "",
    company: "",
    subject: "",
    category: "account_issue",
    priority: "normal",
    message: ""
  });

  const loadTickets = useCallback(
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
        const {
          data: { user },
          error: authError
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error(
            "Please sign in to access support."
          );
        }

        setUserId(user.id);
        setAccountEmail(user.email || initialEmail);

        const metadata =
          (user.user_metadata || {}) as Record<
            string,
            unknown
          >;

        setForm((current) => ({
          ...current,

          name:
            current.name ||
            String(
              metadata.full_name ||
                metadata.name ||
                ""
            ),

          company:
            current.company ||
            String(
              metadata.company_name ||
                metadata.company ||
                ""
            )
        }));

        const response = await fetch(
          "/clientpilotai/api/support/tickets",
          {
            cache: "no-store"
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to load support tickets."
          );
        }

        setTickets(result.tickets || []);
      } catch (error) {
        setNotice({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Unable to load support tickets."
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      initialEmail,
      supabase
    ]
  );

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  function selectAttachment(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] || null;

    setNotice(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      setSelectedFile(null);

      event.target.value = "";

      setNotice({
        type: "error",
        text:
          "Upload a JPG, PNG, WebP or PDF file."
      });

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);

      event.target.value = "";

      setNotice({
        type: "error",
        text:
          "The attachment must be 5 MB or smaller."
      });

      return;
    }

    setSelectedFile(file);
  }

  function removeAttachment() {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function uploadAttachment(
    file: File,
    authenticatedUserId: string
  ) {
    const safeName =
      createSafeFileName(file.name);

    const path =
      `${authenticatedUserId}/` +
      `${crypto.randomUUID()}-${safeName}`;

    const {
      error
    } = await supabase.storage
      .from("support-attachments")
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false
      });

    if (error) {
      throw new Error(
        `Unable to upload attachment: ${error.message}`
      );
    }

    return path;
  }

  async function submitTicket(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSubmitting(true);
    setNotice(null);

    let uploadedPath: string | null = null;

    try {
      let authenticatedUserId = userId;

      if (!authenticatedUserId) {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser();

        if (error || !user) {
          throw new Error(
            "Please sign in before submitting an issue."
          );
        }

        authenticatedUserId = user.id;
        setUserId(user.id);
      }

      if (selectedFile) {
        uploadedPath =
          await uploadAttachment(
            selectedFile,
            authenticatedUserId
          );
      }

      const response = await fetch(
        "/clientpilotai/api/support/tickets",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            name: form.name,
            company: form.company,
            subject: form.subject,
            category: form.category,
            priority: form.priority,
            message: form.message,
            attachment_path: uploadedPath
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to submit support issue."
        );
      }

      setForm((current) => ({
        ...current,
        subject: "",
        category: "account_issue",
        priority: "normal",
        message: ""
      }));

      removeAttachment();

      setNotice({
        type: "success",
        text:
          `Issue submitted successfully. Ticket number: ${result.ticket.ticket_number}`
      });

      await loadTickets("refresh");
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage
          .from("support-attachments")
          .remove([uploadedPath]);
      }

      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to submit support issue."
      });
    } finally {
      setSubmitting(false);
    }
  }

  const openTickets = tickets.filter(
    (ticket) =>
      [
        "new",
        "open",
        "in_progress"
      ].includes(ticket.status)
  ).length;

  const waitingTickets = tickets.filter(
    (ticket) =>
      ticket.status === "waiting_for_client"
  ).length;

  const completedTickets = tickets.filter(
    (ticket) =>
      [
        "resolved",
        "closed"
      ].includes(ticket.status)
  ).length;

  return (
    <div className="cp-client-support-page">
      <section className="cp-client-support-hero">
        <div>
          <span className="cp-eyebrow">
            Makzora Customer Care
          </span>

          <h1>Support Center</h1>

          <p>
            Submit an issue, attach a screenshot,
            review Makzora replies and track every
            support request from your ClientPilot AI
            account.
          </p>

          <div className="cp-client-support-account">
            <span>Account email</span>
            <strong>{accountEmail}</strong>
          </div>
        </div>

        <div className="cp-client-support-hero-actions">
          <a
            href="mailto:info@makzora.com?subject=ClientPilot%20AI%20Support"
          >
            Email Makzora
          </a>

          <button
            type="button"
            onClick={() =>
              void loadTickets("refresh")
            }
            disabled={refreshing}
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh Tickets"}
          </button>
        </div>
      </section>

      {notice ? (
        <div
          className={`cp-client-support-notice cp-client-support-notice-${notice.type}`}
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
            aria-label="Close message"
          >
            ×
          </button>
        </div>
      ) : null}

      <section className="cp-client-support-summary">
        <article>
          <span>Total tickets</span>
          <strong>{tickets.length}</strong>
          <small>All requests</small>
        </article>

        <article>
          <span>Open</span>
          <strong>{openTickets}</strong>
          <small>Makzora reviewing</small>
        </article>

        <article>
          <span>Waiting for you</span>
          <strong>{waitingTickets}</strong>
          <small>Owner has replied</small>
        </article>

        <article>
          <span>Completed</span>
          <strong>{completedTickets}</strong>
          <small>Resolved or closed</small>
        </article>
      </section>

      <div className="cp-client-support-grid">
        <section className="cp-client-support-card">
          <div className="cp-client-support-card-head">
            <div>
              <span>New support request</span>
              <h2>Submit an issue</h2>
            </div>

            <strong>Secure</strong>
          </div>

          <form
            className="cp-client-support-form"
            onSubmit={submitTicket}
          >
            <div className="cp-client-support-columns">
              <label>
                <span>Your name</span>

                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                  placeholder="Your full name"
                  maxLength={150}
                  required
                />
              </label>

              <label>
                <span>Company</span>

                <input
                  value={form.company}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      company:
                        event.target.value
                    }))
                  }
                  placeholder="Optional"
                  maxLength={200}
                />
              </label>
            </div>

            <label>
              <span>Subject</span>

              <input
                value={form.subject}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subject:
                      event.target.value
                  }))
                }
                placeholder="Briefly describe the issue"
                minLength={3}
                maxLength={200}
                required
              />
            </label>

            <div className="cp-client-support-columns">
              <label>
                <span>Issue category</span>

                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category:
                        event.target.value
                    }))
                  }
                >
                  {CATEGORIES.map(
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
                  value={form.priority}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      priority:
                        event.target.value
                    }))
                  }
                >
                  {PRIORITIES.map(
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
            </div>

            <label>
              <span>Issue details</span>

              <textarea
                value={form.message}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    message:
                      event.target.value
                  }))
                }
                placeholder="Explain what happened, what you expected, and any error message you received."
                minLength={5}
                maxLength={10000}
                required
              />
            </label>

            <label className="cp-client-support-upload">
              <span>
                Screenshot or PDF
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                onChange={selectAttachment}
              />

              <small>
                Optional. Maximum file size: 5 MB.
              </small>
            </label>

            {selectedFile ? (
              <div className="cp-client-support-selected-file">
                <div>
                  <strong>
                    {selectedFile.name}
                  </strong>

                  <small>
                    {(
                      selectedFile.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </small>
                </div>

                <button
                  type="button"
                  onClick={removeAttachment}
                >
                  Remove
                </button>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Submitting Issue..."
                : "Submit Support Issue"}
            </button>
          </form>
        </section>

        <section className="cp-client-support-card">
          <div className="cp-client-support-card-head">
            <div>
              <span>Your support history</span>
              <h2>Submitted tickets</h2>
            </div>

            <strong>
              {tickets.length}
            </strong>
          </div>

          {loading ? (
            <div className="cp-client-support-empty">
              Loading your support tickets...
            </div>
          ) : !tickets.length ? (
            <div className="cp-client-support-empty">
              <strong>No support issues yet</strong>

              <p>
                Your submitted tickets and Makzora
                replies will appear here.
              </p>
            </div>
          ) : (
            <div className="cp-client-support-ticket-list">
              {tickets.map((ticket) => (
                <Link
                  href={`/dashboard/support/${ticket.id}`}
                  className="cp-client-support-ticket"
                  key={ticket.id}
                >
                  <div className="cp-client-support-ticket-top">
                    <strong>
                      {ticket.ticket_number}
                    </strong>

                    <span
                      className={`cp-client-support-badge cp-client-support-status-${ticket.status}`}
                    >
                      {formatLabel(
                        ticket.status
                      )}
                    </span>
                  </div>

                  <h3>{ticket.subject}</h3>

                  <div className="cp-client-support-ticket-meta">
                    <span>
                      {formatLabel(
                        ticket.category
                      )}
                    </span>

                    <span>
                      {formatLabel(
                        ticket.priority
                      )}
                    </span>

                    <span>
                      {formatLabel(
                        ticket.plan
                      )}{" "}
                      plan
                    </span>
                  </div>

                  <div className="cp-client-support-ticket-bottom">
                    <small>
                      Updated{" "}
                      {formatDate(
                        ticket.updated_at
                      )}
                    </small>

                    <strong>Open →</strong>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
