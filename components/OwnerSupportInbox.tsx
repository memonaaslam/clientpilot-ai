"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent
} from "react";

type TicketRow = {
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
  status: string;
  assigned_to?: string | null;
  client_last_message_at?: string | null;
  admin_last_reply_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
};

type SupportSummary = {
  total: number;
  open: number;
  urgent: number;
  waitingForClient: number;
  resolved: number;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type SupportResponse = {
  tickets: TicketRow[];
  summary: SupportSummary;
  pagination: Pagination;
  error?: string;
};

type Notice = {
  type: "error" | "success";
  text: string;
};

const STATUS_OPTIONS = [
  ["all", "All statuses"],
  ["new", "New"],
  ["open", "Open"],
  ["in_progress", "In progress"],
  ["waiting_for_client", "Waiting for client"],
  ["resolved", "Resolved"],
  ["closed", "Closed"]
] as const;

const PRIORITY_OPTIONS = [
  ["all", "All priorities"],
  ["low", "Low"],
  ["normal", "Normal"],
  ["high", "High"],
  ["urgent", "Urgent"]
] as const;

const PLAN_OPTIONS = [
  ["all", "All plans"],
  ["free", "Free"],
  ["starter", "Starter"],
  ["pro", "Pro"],
  ["agency", "Agency"]
] as const;

const CATEGORY_OPTIONS = [
  ["all", "All categories"],
  ["login_issue", "Login issue"],
  ["subscription_issue", "Subscription issue"],
  ["payment_issue", "Payment issue"],
  ["meeting_upload_issue", "Meeting upload"],
  ["transcription_issue", "Transcription"],
  ["proposal_issue", "Proposal"],
  ["task_issue", "Task"],
  ["reminder_issue", "Reminder"],
  ["account_issue", "Account"],
  ["feature_request", "Feature request"],
  ["other", "Other"]
] as const;

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

function getInitials(name: string) {
  const parts = String(name || "Customer")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return (
    parts
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "CU"
  );
}

export function OwnerSupportInbox({
  ownerEmail
}: {
  ownerEmail: string;
}) {
  const [tickets, setTickets] = useState<
    TicketRow[]
  >([]);

  const [summary, setSummary] =
    useState<SupportSummary>({
      total: 0,
      open: 0,
      urgent: 0,
      waitingForClient: 0,
      resolved: 0
    });

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1
    });

  const [status, setStatus] = useState("all");
  const [priority, setPriority] =
    useState("all");
  const [plan, setPlan] = useState("all");
  const [category, setCategory] =
    useState("all");

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const loadTickets = useCallback(
    async (
      requestedPage: number,
      mode: "load" | "refresh" = "load"
    ) => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setNotice(null);

      try {
        const params = new URLSearchParams();

        params.set(
          "page",
          String(requestedPage)
        );

        params.set(
          "pageSize",
          String(pagination.pageSize)
        );

        if (status !== "all") {
          params.set("status", status);
        }

        if (priority !== "all") {
          params.set("priority", priority);
        }

        if (plan !== "all") {
          params.set("plan", plan);
        }

        if (category !== "all") {
          params.set("category", category);
        }

        if (search.trim()) {
          params.set("q", search.trim());
        }

        const response = await fetch(
          `/clientpilotai/api/owner/support?${params.toString()}`,
          {
            cache: "no-store"
          }
        );

        const result =
          (await response.json()) as SupportResponse;

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to load support tickets."
          );
        }

        setTickets(result.tickets || []);

        setSummary(
          result.summary || {
            total: 0,
            open: 0,
            urgent: 0,
            waitingForClient: 0,
            resolved: 0
          }
        );

        setPagination(
          result.pagination || {
            page: requestedPage,
            pageSize: 20,
            total: 0,
            totalPages: 1
          }
        );
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
      category,
      pagination.pageSize,
      plan,
      priority,
      search,
      status
    ]
  );

  useEffect(() => {
    void loadTickets(1);
  }, [loadTickets]);

  function applySearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSearch(searchInput.trim());

    setPagination((current) => ({
      ...current,
      page: 1
    }));
  }

  function clearFilters() {
    setStatus("all");
    setPriority("all");
    setPlan("all");
    setCategory("all");
    setSearchInput("");
    setSearch("");

    setPagination((current) => ({
      ...current,
      page: 1
    }));
  }

  return (
    <main className="mz-support-page">
      <section className="mz-support-hero">
        <div className="mz-support-hero-content">
          <span className="mz-support-eyebrow">
            Makzora Private Support Center
          </span>

          <h1>Client Issues</h1>

          <p>
            Manage customer questions, subscription
            problems, payments and urgent support
            requests from one secure owner inbox.
          </p>

          <div className="mz-support-owner-row">
            <span className="mz-support-owner-chip">
              <span className="mz-support-owner-icon">
                M
              </span>

              <span>
                <small>Authorized owner</small>
                <strong>{ownerEmail}</strong>
              </span>
            </span>

            <span className="mz-support-total-chip">
              {summary.total} total{" "}
              {summary.total === 1
                ? "ticket"
                : "tickets"}
            </span>
          </div>
        </div>

        <div className="mz-support-hero-actions">
          <Link
            className="mz-support-secondary-button"
            href="/dashboard/owner"
          >
            Owner Dashboard
          </Link>

          <button
            className="mz-support-primary-button"
            type="button"
            onClick={() =>
              void loadTickets(
                pagination.page,
                "refresh"
              )
            }
            disabled={refreshing}
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh Inbox"}
          </button>
        </div>
      </section>

      {notice ? (
        <div
          className={`mz-support-notice mz-support-notice-${notice.type}`}
          role="alert"
        >
          <span className="mz-support-notice-icon">
            {notice.type === "success"
              ? "✓"
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

      <section className="mz-support-stat-grid">
        <article className="mz-support-stat mz-support-stat-dark">
          <div className="mz-support-stat-top">
            <span>Total tickets</span>
            <span className="mz-support-stat-symbol">
              ALL
            </span>
          </div>

          <strong>{summary.total}</strong>
          <small>All customer requests</small>
        </article>

        <article className="mz-support-stat">
          <div className="mz-support-stat-top">
            <span>Open issues</span>
            <span className="mz-support-stat-symbol">
              OPEN
            </span>
          </div>

          <strong>{summary.open}</strong>
          <small>Require owner attention</small>
        </article>

        <article className="mz-support-stat mz-support-stat-urgent">
          <div className="mz-support-stat-top">
            <span>Urgent issues</span>
            <span className="mz-support-stat-symbol">
              !
            </span>
          </div>

          <strong>{summary.urgent}</strong>
          <small>Highest priority requests</small>
        </article>

        <article className="mz-support-stat">
          <div className="mz-support-stat-top">
            <span>Waiting for client</span>
            <span className="mz-support-stat-symbol">
              WAIT
            </span>
          </div>

          <strong>
            {summary.waitingForClient}
          </strong>

          <small>Owner response already sent</small>
        </article>

        <article className="mz-support-stat mz-support-stat-gold">
          <div className="mz-support-stat-top">
            <span>Resolved</span>
            <span className="mz-support-stat-symbol">
              DONE
            </span>
          </div>

          <strong>{summary.resolved}</strong>
          <small>Successfully completed</small>
        </article>
      </section>

      <section className="mz-support-panel">
        <div className="mz-support-panel-heading">
          <div>
            <span>Inbox controls</span>
            <h2>Search and filter issues</h2>
          </div>

          <button
            type="button"
            className="mz-support-clear-button"
            onClick={clearFilters}
          >
            Clear all filters
          </button>
        </div>

        <form
          className="mz-support-search-form"
          onSubmit={applySearch}
        >
          <div className="mz-support-search-field">
            <span className="mz-support-search-icon">
              ⌕
            </span>

            <input
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              placeholder="Search ticket number, client, company, email or subject"
              aria-label="Search support tickets"
            />
          </div>

          <button type="submit">
            Search tickets
          </button>
        </form>

        <div className="mz-support-filter-grid">
          <label>
            <span>Status</span>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);

                setPagination((current) => ({
                  ...current,
                  page: 1
                }));
              }}
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
              onChange={(event) => {
                setPriority(
                  event.target.value
                );

                setPagination((current) => ({
                  ...current,
                  page: 1
                }));
              }}
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
            <span>Plan</span>

            <select
              value={plan}
              onChange={(event) => {
                setPlan(event.target.value);

                setPagination((current) => ({
                  ...current,
                  page: 1
                }));
              }}
            >
              {PLAN_OPTIONS.map(
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
            <span>Category</span>

            <select
              value={category}
              onChange={(event) => {
                setCategory(
                  event.target.value
                );

                setPagination((current) => ({
                  ...current,
                  page: 1
                }));
              }}
            >
              {CATEGORY_OPTIONS.map(
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
      </section>

      <section className="mz-support-panel mz-support-inbox-panel">
        <div className="mz-support-panel-heading">
          <div>
            <span>Customer support inbox</span>
            <h2>Submitted issues</h2>
          </div>

          <div className="mz-support-result-count">
            {pagination.total}{" "}
            {pagination.total === 1
              ? "result"
              : "results"}
          </div>
        </div>

        {loading ? (
          <div className="mz-support-state">
            <span className="mz-support-loader" />
            <strong>Loading support tickets</strong>
            <p>
              Please wait while the secure inbox is
              updated.
            </p>
          </div>
        ) : !tickets.length ? (
          <div className="mz-support-state">
            <span className="mz-support-empty-icon">
              0
            </span>

            <strong>No support tickets found</strong>

            <p>
              No issues match the selected search
              and filters.
            </p>
          </div>
        ) : (
          <div className="mz-support-ticket-list">
            <div className="mz-support-list-header">
              <span>Ticket</span>
              <span>Customer</span>
              <span>Plan</span>
              <span>Category</span>
              <span>Priority</span>
              <span>Status</span>
              <span>Updated</span>
              <span>Action</span>
            </div>

            {tickets.map((ticket) => (
              <article
                className="mz-support-ticket-row"
                key={ticket.id}
              >
                <div
                  className="mz-support-ticket-main"
                  data-label="Ticket"
                >
                  <strong>
                    {ticket.ticket_number}
                  </strong>

                  <p>{ticket.subject}</p>
                </div>

                <div
                  className="mz-support-customer"
                  data-label="Customer"
                >
                  <span className="mz-support-avatar">
                    {getInitials(
                      ticket.customer_name
                    )}
                  </span>

                  <span>
                    <strong>
                      {ticket.customer_name}
                    </strong>

                    {ticket.company_name ? (
                      <small>
                        {ticket.company_name}
                      </small>
                    ) : null}

                    <small>
                      {ticket.customer_email}
                    </small>
                  </span>
                </div>

                <div
                  className="mz-support-cell"
                  data-label="Plan"
                >
                  <span
                    className={`mz-support-badge mz-support-plan-${ticket.plan}`}
                  >
                    {formatLabel(ticket.plan)}
                  </span>
                </div>

                <div
                  className="mz-support-cell"
                  data-label="Category"
                >
                  <span className="mz-support-category">
                    {formatLabel(ticket.category)}
                  </span>
                </div>

                <div
                  className="mz-support-cell"
                  data-label="Priority"
                >
                  <span
                    className={`mz-support-badge mz-support-priority-${ticket.priority}`}
                  >
                    {formatLabel(
                      ticket.priority
                    )}
                  </span>
                </div>

                <div
                  className="mz-support-cell"
                  data-label="Status"
                >
                  <span
                    className={`mz-support-badge mz-support-status-${ticket.status}`}
                  >
                    {formatLabel(ticket.status)}
                  </span>
                </div>

                <div
                  className="mz-support-date"
                  data-label="Updated"
                >
                  {formatDate(ticket.updated_at)}
                </div>

                <div
                  className="mz-support-action"
                  data-label="Action"
                >
                  <Link
                    href={`/makzora-owner/products/clientpilot-ai/support/${ticket.id}`}
                  >
                    Open ticket
                    <span>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mz-support-pagination">
          <span>
            Page <strong>{pagination.page}</strong>{" "}
            of{" "}
            <strong>
              {pagination.totalPages}
            </strong>
          </span>

          <div>
            <button
              type="button"
              disabled={
                loading ||
                pagination.page <= 1
              }
              onClick={() =>
                void loadTickets(
                  pagination.page - 1
                )
              }
            >
              ← Previous
            </button>

            <button
              type="button"
              disabled={
                loading ||
                pagination.page >=
                  pagination.totalPages
              }
              onClick={() =>
                void loadTickets(
                  pagination.page + 1
                )
              }
            >
              Next →
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
