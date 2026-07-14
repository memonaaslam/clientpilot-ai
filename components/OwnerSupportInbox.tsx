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
];

const PRIORITY_OPTIONS = [
  ["all", "All priorities"],
  ["low", "Low"],
  ["normal", "Normal"],
  ["high", "High"],
  ["urgent", "Urgent"]
];

const PLAN_OPTIONS = [
  ["all", "All plans"],
  ["free", "Free"],
  ["starter", "Starter"],
  ["pro", "Pro"],
  ["agency", "Agency"]
];

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

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to load support tickets."
          );
        }

        const supportData =
          result as SupportResponse;

        setTickets(
          supportData.tickets || []
        );

        setSummary(
          supportData.summary || {
            total: 0,
            open: 0,
            urgent: 0,
            waitingForClient: 0,
            resolved: 0
          }
        );

        setPagination(
          supportData.pagination || {
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
    <div className="cp-owner-support-page">
      <section className="cp-owner-support-hero">
        <div>
          <span className="cp-owner-eyebrow">
            Makzora Private Support Center
          </span>

          <h1>Client Issues</h1>

          <p>
            Review customer questions, payment
            issues, account problems and urgent
            support requests from one secure inbox.
          </p>

          <div className="cp-owner-support-meta">
            <span>Owner: {ownerEmail}</span>

            <span>
              {summary.total} total tickets
            </span>
          </div>
        </div>

        <div className="cp-owner-support-actions">
          <Link href="/dashboard/owner">
            Owner Dashboard
          </Link>

          <button
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

      <section className="cp-owner-support-summary">
        <article className="cp-owner-support-summary-dark">
          <span>Total tickets</span>
          <strong>{summary.total}</strong>
          <small>All customer issues</small>
        </article>

        <article>
          <span>Open issues</span>
          <strong>{summary.open}</strong>
          <small>Need owner attention</small>
        </article>

        <article className="cp-owner-support-summary-urgent">
          <span>Urgent issues</span>
          <strong>{summary.urgent}</strong>
          <small>Highest priority</small>
        </article>

        <article>
          <span>Waiting for client</span>
          <strong>
            {summary.waitingForClient}
          </strong>
          <small>Owner has replied</small>
        </article>

        <article className="cp-owner-support-summary-gold">
          <span>Resolved</span>
          <strong>{summary.resolved}</strong>
          <small>Completed tickets</small>
        </article>
      </section>

      <section className="cp-owner-card cp-owner-support-filter-card">
        <div className="cp-owner-card-head">
          <div>
            <span>Inbox controls</span>
            <h2>Search and filter issues</h2>
          </div>

          <button
            type="button"
            className="cp-owner-support-clear"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>

        <form
          className="cp-owner-support-search"
          onSubmit={applySearch}
        >
          <input
            value={searchInput}
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
            placeholder="Search ticket number, client, company, email or subject"
          />

          <button type="submit">
            Search
          </button>
        </form>

        <div className="cp-owner-support-filters">
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

      <section className="cp-owner-card cp-owner-support-table-card">
        <div className="cp-owner-card-head">
          <div>
            <span>Customer support inbox</span>
            <h2>Submitted issues</h2>
          </div>

          <strong>
            {pagination.total} results
          </strong>
        </div>

        {loading ? (
          <div className="cp-owner-support-loading">
            Loading support tickets...
          </div>
        ) : !tickets.length ? (
          <div className="cp-owner-empty">
            No support tickets match the selected
            filters.
          </div>
        ) : (
          <div className="cp-owner-table-wrap">
            <table className="cp-owner-table cp-owner-support-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Client</th>
                  <th>Plan</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <strong>
                        {ticket.ticket_number}
                      </strong>

                      <small>
                        {ticket.subject}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {ticket.customer_name}
                      </strong>

                      <small>
                        {ticket.company_name ||
                          ticket.customer_email}
                      </small>
                    </td>

                    <td>
                      <span
                        className={`cp-owner-support-badge cp-owner-support-plan-${ticket.plan}`}
                      >
                        {formatLabel(ticket.plan)}
                      </span>
                    </td>

                    <td>
                      {formatLabel(
                        ticket.category
                      )}
                    </td>

                    <td>
                      <span
                        className={`cp-owner-support-badge cp-owner-support-priority-${ticket.priority}`}
                      >
                        {formatLabel(
                          ticket.priority
                        )}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`cp-owner-support-badge cp-owner-support-status-${ticket.status}`}
                      >
                        {formatLabel(
                          ticket.status
                        )}
                      </span>
                    </td>

                    <td>
                      {formatDate(
                        ticket.updated_at
                      )}
                    </td>

                    <td>
                      <Link
                        className="cp-owner-support-view"
                        href={`/dashboard/owner/support/${ticket.id}`}
                      >
                        Open ticket
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="cp-owner-support-pagination">
          <span>
            Page {pagination.page} of{" "}
            {pagination.totalPages}
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
              Previous
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
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
