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
  client_last_message_at?: string | null;
  admin_last_reply_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
};

type TicketMessage = {
  id: string;
  sender_user_id?: string | null;
  sender_type: "client" | "owner" | "system";
  message: string;
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

const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
]);

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

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

export function ClientSupportTicket({
  ticketId,
  accountEmail
}: {
  ticketId: string;
  accountEmail: string;
}) {
  const supabase = useMemo(
    () => createSupabaseBrowserClient(),
    []
  );

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [ticket, setTicket] =
    useState<SupportTicket | null>(null);

  const [messages, setMessages] = useState<
    TicketMessage[]
  >([]);

  const [
    signedAttachmentUrls,
    setSignedAttachmentUrls
  ] = useState<Record<string, string>>({});

  const [userId, setUserId] =
    useState("");

  const [replyMessage, setReplyMessage] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const createSignedAttachmentUrls =
    useCallback(
      async (
        ticketData: SupportTicket,
        messageRows: TicketMessage[]
      ) => {
        const attachmentEntries = [
          {
            key: `ticket-${ticketData.id}`,
            path:
              ticketData.attachment_url || null
          },

          ...messageRows.map((message) => ({
            key: `message-${message.id}`,
            path:
              message.attachment_url || null
          }))
        ].filter(
          (
            entry
          ): entry is {
            key: string;
            path: string;
          } => Boolean(entry.path)
        );

        if (!attachmentEntries.length) {
          setSignedAttachmentUrls({});
          return;
        }

        const signedResults =
          await Promise.all(
            attachmentEntries.map(
              async (entry) => {
                const {
                  data,
                  error
                } = await supabase.storage
                  .from(
                    "support-attachments"
                  )
                  .createSignedUrl(
                    entry.path,
                    600
                  );

                if (
                  error ||
                  !data?.signedUrl
                ) {
                  return null;
                }

                return [
                  entry.key,
                  data.signedUrl
                ] as const;
              }
            )
          );

        const validResults =
          signedResults.filter(
            (
              result
            ): result is readonly [
              string,
              string
            ] => Boolean(result)
          );

        setSignedAttachmentUrls(
          Object.fromEntries(validResults)
        );
      },
      [supabase]
    );

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
        const {
          data: { user },
          error: authError
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error(
            "Please sign in to view this ticket."
          );
        }

        setUserId(user.id);

        const response = await fetch(
          `/clientpilotai/api/support/tickets/${ticketId}`,
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

        await createSignedAttachmentUrls(
          data.ticket,
          data.messages || []
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
    [
      createSignedAttachmentUrls,
      supabase,
      ticketId
    ]
  );

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

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
      event.target.value = "";

      setSelectedFile(null);

      setNotice({
        type: "error",
        text:
          "Upload a JPG, PNG, WebP or PDF file."
      });

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      event.target.value = "";

      setSelectedFile(null);

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
    const path =
      `${authenticatedUserId}/` +
      `${crypto.randomUUID()}-` +
      createSafeFileName(file.name);

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
          "Write a reply before submitting."
      });

      return;
    }

    setSending(true);
    setNotice(null);

    let uploadedPath: string | null =
      null;

    try {
      let authenticatedUserId =
        userId;

      if (!authenticatedUserId) {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser();

        if (error || !user) {
          throw new Error(
            "Please sign in before replying."
          );
        }

        authenticatedUserId =
          user.id;

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
        `/clientpilotai/api/support/tickets/${ticketId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            message,
            attachment_path:
              uploadedPath
          })
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to submit your reply."
        );
      }

      setReplyMessage("");
      removeAttachment();

      setNotice({
        type: "success",
        text:
          "Your reply was submitted successfully."
      });

      await loadTicket("refresh");
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
            : "Unable to submit your reply."
      });
    } finally {
      setSending(false);
    }
  }

  if (loading && !ticket) {
    return (
      <div className="cp-client-ticket-page">
        <div className="cp-client-support-empty">
          Loading support ticket...
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="cp-client-ticket-page">
        {notice ? (
          <div className="cp-client-support-notice cp-client-support-notice-error">
            <span>!</span>
            <p>{notice.text}</p>
          </div>
        ) : null}

        <Link
          className="cp-client-ticket-back-dark"
          href="/dashboard/support"
        >
          Return to Support Center
        </Link>
      </div>
    );
  }

  return (
    <div className="cp-client-ticket-page">
      <section className="cp-client-ticket-hero">
        <div>
          <Link
            className="cp-client-ticket-back"
            href="/dashboard/support"
          >
            ← Support Center
          </Link>

          <span className="cp-eyebrow">
            Makzora Customer Care
          </span>

          <h1>{ticket.ticket_number}</h1>

          <p>{ticket.subject}</p>

          <div className="cp-client-ticket-hero-meta">
            <span>
              Account: {accountEmail}
            </span>

            <span>
              Created:{" "}
              {formatDate(ticket.created_at)}
            </span>
          </div>
        </div>

        <div className="cp-client-ticket-status">
          <span
            className={`cp-client-support-badge cp-client-support-status-${ticket.status}`}
          >
            {formatLabel(ticket.status)}
          </span>

          <span className="cp-client-ticket-priority">
            {formatLabel(ticket.priority)}{" "}
            priority
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

      <div className="cp-client-ticket-grid">
        <main className="cp-client-ticket-main">
          <section className="cp-client-support-card">
            <div className="cp-client-support-card-head">
              <div>
                <span>Ticket conversation</span>
                <h2>Messages</h2>
              </div>

              <strong>
                {messages.length}
              </strong>
            </div>

            <div className="cp-client-ticket-conversation">
              {messages.map((message) => {
                const attachmentKey =
                  message.is_initial_message
                    ? `ticket-${ticket.id}`
                    : `message-${message.id}`;

                const signedUrl =
                  signedAttachmentUrls[
                    attachmentKey
                  ];

                return (
                  <article
                    className={[
                      "cp-client-ticket-message",
                      message.sender_type ===
                      "owner"
                        ? "cp-client-ticket-message-owner"
                        : "cp-client-ticket-message-client"
                    ].join(" ")}
                    key={message.id}
                  >
                    <div className="cp-client-ticket-message-head">
                      <div>
                        <strong>
                          {message.sender_type ===
                          "owner"
                            ? "Makzora Support"
                            : ticket.customer_name}
                        </strong>

                        <span>
                          {message.sender_type ===
                          "owner"
                            ? "Official reply"
                            : "Your message"}
                        </span>
                      </div>

                      <time>
                        {formatDate(
                          message.created_at
                        )}
                      </time>
                    </div>

                    <p>{message.message}</p>

                    {signedUrl ? (
                      <a
                        className="cp-client-ticket-attachment"
                        href={signedUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open attachment
                      </a>
                    ) : message.attachment_url ? (
                      <span className="cp-client-ticket-attachment-unavailable">
                        Private attachment saved
                      </span>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="cp-client-support-card">
            <div className="cp-client-support-card-head">
              <div>
                <span>Continue conversation</span>
                <h2>Reply to Makzora</h2>
              </div>

              <strong>
                Secure reply
              </strong>
            </div>

            <form
              className="cp-client-ticket-reply-form"
              onSubmit={submitReply}
            >
              <textarea
                value={replyMessage}
                onChange={(event) =>
                  setReplyMessage(
                    event.target.value
                  )
                }
                placeholder="Write your reply or provide more information..."
                minLength={1}
                maxLength={10000}
                required
              />

              <label className="cp-client-support-upload">
                <span>
                  Add screenshot or PDF
                </span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  onChange={selectAttachment}
                />

                <small>
                  Optional. Maximum size: 5 MB.
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

              <div className="cp-client-ticket-reply-footer">
                <small>
                  Replying to a resolved or closed
                  ticket will reopen it automatically.
                </small>

                <button
                  type="submit"
                  disabled={sending}
                >
                  {sending
                    ? "Submitting Reply..."
                    : "Submit Reply"}
                </button>
              </div>
            </form>
          </section>
        </main>

        <aside className="cp-client-ticket-sidebar">
          <section className="cp-client-support-card">
            <div className="cp-client-support-card-head">
              <div>
                <span>Ticket details</span>
                <h2>Issue information</h2>
              </div>
            </div>

            <div className="cp-client-ticket-details">
              <div>
                <span>Status</span>

                <strong>
                  {formatLabel(ticket.status)}
                </strong>
              </div>

              <div>
                <span>Priority</span>

                <strong>
                  {formatLabel(
                    ticket.priority
                  )}
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
                <span>Plan</span>

                <strong>
                  {formatLabel(ticket.plan)}
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
                <span>Last updated</span>

                <strong>
                  {formatDate(
                    ticket.updated_at
                  )}
                </strong>
              </div>

              {ticket.resolved_at ? (
                <div>
                  <span>Resolved</span>

                  <strong>
                    {formatDate(
                      ticket.resolved_at
                    )}
                  </strong>
                </div>
              ) : null}
            </div>
          </section>

          <section className="cp-client-support-card cp-client-ticket-help-card">
            <span>Need another option?</span>

            <h2>Email Makzora</h2>

            <p>
              You can also contact our support team
              directly using your registered email.
            </p>

            <a
              href={`mailto:info@makzora.com?subject=${encodeURIComponent(
                `${ticket.ticket_number} - ${ticket.subject}`
              )}`}
            >
              info@makzora.com
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
