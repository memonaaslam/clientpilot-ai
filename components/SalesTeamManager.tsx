"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent
} from "react";

type SalesUser = {
  id: string;
  staff_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  status: string;
  created_at?: string | null;
};

type SalesTeamManagerProps = {
  currentPlan: string;
};

type PlanId = "free" | "starter" | "pro" | "agency";
type StatusFilter = "all" | "active" | "inactive";

type StatusMessage = {
  type: "success" | "error";
  text: string;
};

type AccessCredentials = {
  name: string;
  staffId: string;
  pin: string;
};

const SALES_USER_LIMITS: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  agency: 5
};

const PLAN_LABELS: Record<PlanId, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  agency: "Agency"
};

function normalizePlan(plan: string): PlanId {
  const normalized = String(plan || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "starter" ||
    normalized === "pro" ||
    normalized === "agency"
  ) {
    return normalized;
  }

  return "free";
}

function isActiveSalesUser(status?: string | null) {
  return String(status || "").toLowerCase() === "active";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Recently created";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently created";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function getInitials(name?: string | null) {
  const words = String(name || "Sales User")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "SU";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function SalesTeamManager({
  currentPlan
}: SalesTeamManagerProps) {
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [updatingUserId, setUpdatingUserId] = useState<
    string | null
  >(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [statusMessage, setStatusMessage] =
    useState<StatusMessage | null>(null);

  const [newAccess, setNewAccess] =
    useState<AccessCredentials | null>(null);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    null
  );

  const normalizedPlan = normalizePlan(currentPlan);
  const planLabel = PLAN_LABELS[normalizedPlan];
  const salesUserLimit = SALES_USER_LIMITS[normalizedPlan];

  const activeCount = useMemo(
    () =>
      salesUsers.filter((salesUser) =>
        isActiveSalesUser(salesUser.status)
      ).length,
    [salesUsers]
  );

  const inactiveCount = Math.max(
    salesUsers.length - activeCount,
    0
  );

  const remainingSeats = Math.max(
    salesUserLimit - activeCount,
    0
  );

  const hasSalesAccess = salesUserLimit > 0;

  const limitReached =
    hasSalesAccess && activeCount >= salesUserLimit;

  const seatUsagePercentage =
    salesUserLimit > 0
      ? Math.min(
          100,
          Math.round((activeCount / salesUserLimit) * 100)
        )
      : 0;

  const filteredSalesUsers = useMemo(() => {
    const normalizedSearch = searchQuery
      .trim()
      .toLowerCase();

    return salesUsers
      .filter((salesUser) => {
        const active = isActiveSalesUser(
          salesUser.status
        );

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && active) ||
          (statusFilter === "inactive" && !active);

        const matchesSearch =
          !normalizedSearch ||
          salesUser.name
            .toLowerCase()
            .includes(normalizedSearch) ||
          salesUser.staff_id
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(salesUser.email || "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(salesUser.phone || "")
            .toLowerCase()
            .includes(normalizedSearch);

        return matchesStatus && matchesSearch;
      })
      .sort((firstUser, secondUser) => {
        const firstActive = isActiveSalesUser(
          firstUser.status
        );

        const secondActive = isActiveSalesUser(
          secondUser.status
        );

        if (firstActive !== secondActive) {
          return firstActive ? -1 : 1;
        }

        const firstDate = firstUser.created_at
          ? new Date(firstUser.created_at).getTime()
          : 0;

        const secondDate = secondUser.created_at
          ? new Date(secondUser.created_at).getTime()
          : 0;

        return secondDate - firstDate;
      });
  }, [salesUsers, searchQuery, statusFilter]);

  async function loadSalesUsers(
    mode: "initial" | "refresh" = "initial"
  ) {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(
        "/clientpilotai/api/sales-users",
        {
          cache: "no-store"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load sales users."
        );
      }

      setSalesUsers(
        Array.isArray(data.salesUsers)
          ? data.salesUsers
          : []
      );

      setLastUpdated(new Date());
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Unable to connect to the sales users service.";

      setStatusMessage({
        type: "error",
        text
      });

      setSalesUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadSalesUsers();
  }, []);

  async function createSalesUser(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!hasSalesAccess) {
      setStatusMessage({
        type: "error",
        text: "Upgrade your plan to create sales users."
      });

      return;
    }

    if (limitReached) {
      setStatusMessage({
        type: "error",
        text: `Your ${planLabel} plan has used all included active sales seats.`
      });

      return;
    }

    setSaving(true);
    setStatusMessage(null);
    setNewAccess(null);

    try {
      const response = await fetch(
        "/clientpilotai/api/sales-users",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            email,
            phone
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to create sales user."
        );
      }

      setNewAccess({
        name: data.salesUser?.name || name,
        staffId: data.salesUser.staff_id,
        pin: data.temporaryPin
      });

      setName("");
      setEmail("");
      setPhone("");

      setStatusMessage({
        type: "success",
        text: "Sales user created successfully. Save the login details shown below."
      });

      await loadSalesUsers("refresh");
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Unable to connect to the sales user service.";

      setStatusMessage({
        type: "error",
        text
      });
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(
    salesUser: SalesUser,
    status: "active" | "inactive"
  ) {
    if (
      status === "active" &&
      activeCount >= salesUserLimit
    ) {
      setStatusMessage({
        type: "error",
        text: `Your ${planLabel} plan allows ${salesUserLimit} active sales user${
          salesUserLimit === 1 ? "" : "s"
        }.`
      });

      return;
    }

    if (status === "inactive") {
      const confirmed = window.confirm(
        `Deactivate ${salesUser.name}? They will no longer be able to access the sales workspace until reactivated.`
      );

      if (!confirmed) {
        return;
      }
    }

    setUpdatingUserId(salesUser.id);
    setStatusMessage(null);

    try {
      const response = await fetch(
        `/clientpilotai/api/sales-users/${salesUser.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ status })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to update sales user."
        );
      }

      setStatusMessage({
        type: "success",
        text:
          status === "active"
            ? `${salesUser.name} was reactivated successfully.`
            : `${salesUser.name} was deactivated successfully.`
      });

      await loadSalesUsers("refresh");
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Unable to connect to the sales user service.";

      setStatusMessage({
        type: "error",
        text
      });
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function resetPin(salesUser: SalesUser) {
    const confirmed = window.confirm(
      `Generate a new PIN for ${salesUser.name}? Their previous PIN will stop working.`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingUserId(salesUser.id);
    setStatusMessage(null);
    setNewAccess(null);

    try {
      const response = await fetch(
        `/clientpilotai/api/sales-users/${salesUser.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            reset_pin: true
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to reset PIN."
        );
      }

      setNewAccess({
        name: data.salesUser?.name || salesUser.name,
        staffId:
          data.salesUser?.staff_id ||
          salesUser.staff_id,
        pin: data.temporaryPin
      });

      setStatusMessage({
        type: "success",
        text: `A new PIN was generated for ${salesUser.name}. Save it before leaving this page.`
      });
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Unable to connect to the sales user service.";

      setStatusMessage({
        type: "error",
        text
      });
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function copyText(
    text: string,
    successText: string
  ) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea =
          document.createElement("textarea");

        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setStatusMessage({
        type: "success",
        text: successText
      });
    } catch {
      setStatusMessage({
        type: "error",
        text: "Unable to copy the login details. Please copy them manually."
      });
    }
  }

  return (
    <div className="cp-sales-team-page">
      <section className="cp-sales-team-hero">
        <div className="cp-sales-team-hero-copy">
          <span className="cp-sales-team-eyebrow">
            ClientPilot AI Sales Team
          </span>

          <h1>Build and control your sales workspace.</h1>

          <p>
            Create secure sales accounts, manage active seats,
            reset access PINs and keep every team member under
            the correct subscription limit.
          </p>

          <div className="cp-sales-team-hero-actions">
            <Link
              href="/sales/login"
              className="cp-sales-team-login-link"
            >
              Open Sales Login
            </Link>

            <Link
              href="/dashboard/sales-activity"
              className="cp-sales-team-activity-link"
            >
              View Sales Activity
            </Link>
          </div>
        </div>

        <div className="cp-sales-team-plan-panel">
          <div className="cp-sales-team-plan-head">
            <div>
              <span>Current subscription</span>
              <strong>{planLabel}</strong>
            </div>

            <span className="cp-sales-team-plan-badge">
              {hasSalesAccess
                ? `${salesUserLimit} seat${
                    salesUserLimit === 1 ? "" : "s"
                  }`
                : "Owner only"}
            </span>
          </div>

          <div className="cp-sales-team-seat-visual">
            <div className="cp-sales-team-seat-number">
              <strong>{activeCount}</strong>
              <span>of {salesUserLimit}</span>
            </div>

            <div>
              <span>Active sales seats used</span>

              <div className="cp-sales-team-seat-track">
                <i
                  style={{
                    width: `${seatUsagePercentage}%`
                  }}
                />
              </div>

              <small>
                {hasSalesAccess
                  ? remainingSeats > 0
                    ? `${remainingSeats} active seat${
                        remainingSeats === 1 ? "" : "s"
                      } available`
                    : "All included active seats are in use"
                  : "Upgrade to add sales users"}
              </small>
            </div>
          </div>

          <div className="cp-sales-team-plan-stats">
            <article>
              <span>Total accounts</span>
              <strong>{salesUsers.length}</strong>
            </article>

            <article>
              <span>Active</span>
              <strong>{activeCount}</strong>
            </article>

            <article>
              <span>Inactive</span>
              <strong>{inactiveCount}</strong>
            </article>
          </div>
        </div>
      </section>

      {statusMessage ? (
        <div
          className={`cp-sales-team-status cp-sales-team-status-${statusMessage.type}`}
          role="status"
        >
          <span>
            {statusMessage.type === "success"
              ? "OK"
              : "!"}
          </span>

          <p>{statusMessage.text}</p>

          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            aria-label="Close message"
          >
            ×
          </button>
        </div>
      ) : null}

      {!hasSalesAccess ? (
        <section className="cp-sales-team-upgrade">
          <div className="cp-sales-team-upgrade-icon">
            <span>UP</span>
          </div>

          <div>
            <span>Sales users are locked on Free</span>
            <h2>Upgrade to create your sales team.</h2>

            <p>
              Starter includes 1 sales user, Pro includes 2,
              and Agency includes 5 active sales users.
            </p>
          </div>

          <Link
            href="/dashboard/subscription"
            className="cp-sales-team-upgrade-button"
          >
            View subscription plans
          </Link>
        </section>
      ) : null}

      <div className="cp-sales-team-main-grid">
        <section className="cp-sales-team-create-card">
          <div className="cp-sales-team-card-heading">
            <div>
              <span>Secure account creation</span>
              <h2>Add a sales person</h2>

              <p>
                ClientPilot automatically creates a unique Staff
                ID and temporary four-digit PIN.
              </p>
            </div>

            <div className="cp-sales-team-step-badge">
              01
            </div>
          </div>

          <form
            className="cp-sales-team-form"
            onSubmit={createSalesUser}
          >
            <label className="cp-sales-team-field">
              <span>Sales person name</span>

              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Enter full name"
                autoComplete="name"
                required
                disabled={
                  !hasSalesAccess ||
                  limitReached ||
                  saving
                }
              />
            </label>

            <div className="cp-sales-team-field-grid">
              <label className="cp-sales-team-field">
                <span>Email address</span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="Optional"
                  autoComplete="email"
                  disabled={
                    !hasSalesAccess ||
                    limitReached ||
                    saving
                  }
                />
              </label>

              <label className="cp-sales-team-field">
                <span>Phone number</span>

                <input
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  placeholder="Optional"
                  autoComplete="tel"
                  disabled={
                    !hasSalesAccess ||
                    limitReached ||
                    saving
                  }
                />
              </label>
            </div>

            <div className="cp-sales-team-form-note">
              <span>Security</span>

              <p>
                The generated PIN is displayed once. Save it
                securely and send it privately to the sales
                person.
              </p>
            </div>

            <button
              className="cp-sales-team-create-button"
              disabled={
                !hasSalesAccess ||
                limitReached ||
                saving
              }
            >
              <span>{saving ? "..." : "ID"}</span>

              <div>
                <strong>
                  {saving
                    ? "Creating secure account"
                    : !hasSalesAccess
                      ? "Upgrade required"
                      : limitReached
                        ? `${salesUserLimit} active seat${
                            salesUserLimit === 1
                              ? ""
                              : "s"
                          } used`
                        : "Generate Staff ID and PIN"}
                </strong>

                <small>
                  {saving
                    ? "Please keep this page open"
                    : limitReached
                      ? "Deactivate a user or upgrade your plan"
                      : `${remainingSeats} active seat${
                          remainingSeats === 1 ? "" : "s"
                        } available`}
                </small>
              </div>
            </button>
          </form>
        </section>

        <section className="cp-sales-team-access-card">
          <div className="cp-sales-team-card-heading">
            <div>
              <span>Login credentials</span>
              <h2>New account access</h2>

              <p>
                Copy the credentials immediately after creating
                an account or resetting a PIN.
              </p>
            </div>

            <div className="cp-sales-team-step-badge">
              02
            </div>
          </div>

          {newAccess ? (
            <div className="cp-sales-team-credentials">
              <div className="cp-sales-team-credential-user">
                <div className="cp-sales-team-avatar">
                  {getInitials(newAccess.name)}
                </div>

                <div>
                  <span>Credentials prepared for</span>
                  <strong>{newAccess.name}</strong>
                </div>

                <span className="cp-sales-team-one-time">
                  Save now
                </span>
              </div>

              <div className="cp-sales-team-credential-row">
                <div>
                  <span>Staff ID</span>
                  <code>{newAccess.staffId}</code>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void copyText(
                      newAccess.staffId,
                      "Staff ID copied successfully."
                    )
                  }
                >
                  Copy
                </button>
              </div>

              <div className="cp-sales-team-credential-row">
                <div>
                  <span>Temporary PIN</span>
                  <code>{newAccess.pin}</code>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void copyText(
                      newAccess.pin,
                      "Temporary PIN copied successfully."
                    )
                  }
                >
                  Copy
                </button>
              </div>

              <button
                type="button"
                className="cp-sales-team-copy-all"
                onClick={() =>
                  void copyText(
                    `ClientPilot AI Sales Login\nStaff ID: ${newAccess.staffId}\nPIN: ${newAccess.pin}`,
                    "Complete sales login copied successfully."
                  )
                }
              >
                Copy complete login details
              </button>

              <div className="cp-sales-team-access-warning">
                <span>Important</span>

                <p>
                  This temporary PIN will not be displayed again
                  after you leave or refresh this page.
                </p>
              </div>
            </div>
          ) : (
            <div className="cp-sales-team-access-empty">
              <div>
                <span>CP</span>
              </div>

              <h3>No new credentials</h3>

              <p>
                Create a sales user or reset an existing user’s
                PIN. Their secure login details will appear here.
              </p>

              <Link href="/sales/login">
                Preview sales login page
              </Link>
            </div>
          )}
        </section>
      </div>

      <section className="cp-sales-team-directory">
        <div className="cp-sales-team-directory-heading">
          <div>
            <span>Owner access control</span>
            <h2>Sales team directory</h2>

            <p>
              Search accounts, review status and control access
              without deleting historical sales records.
            </p>
          </div>

          <div className="cp-sales-team-directory-count">
            <strong>{filteredSalesUsers.length}</strong>
            <span>accounts shown</span>
          </div>
        </div>

        <div className="cp-sales-team-toolbar">
          <label className="cp-sales-team-search">
            <span>⌕</span>

            <input
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="Search name, Staff ID, email or phone"
            />
          </label>

          <div className="cp-sales-team-filters">
            <button
              type="button"
              className={
                statusFilter === "all" ? "active" : ""
              }
              onClick={() => setStatusFilter("all")}
            >
              All
            </button>

            <button
              type="button"
              className={
                statusFilter === "active"
                  ? "active"
                  : ""
              }
              onClick={() => setStatusFilter("active")}
            >
              Active
            </button>

            <button
              type="button"
              className={
                statusFilter === "inactive"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setStatusFilter("inactive")
              }
            >
              Inactive
            </button>
          </div>

          <button
            type="button"
            className="cp-sales-team-refresh"
            onClick={() =>
              void loadSalesUsers("refresh")
            }
            disabled={loading || refreshing}
          >
            <span>{refreshing ? "..." : "↻"}</span>
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>

        <div className="cp-sales-team-update-time">
          <span>
            {lastUpdated
              ? `Last updated ${lastUpdated.toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit"
                  }
                )}`
              : "Waiting for team data"}
          </span>

          <span>
            Active seats are counted against your current plan.
          </span>
        </div>

        {loading ? (
          <div className="cp-sales-team-loading-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <article key={index}>
                <div />
                <span />
                <strong />
                <small />
              </article>
            ))}
          </div>
        ) : null}

        {!loading && salesUsers.length === 0 ? (
          <div className="cp-sales-team-empty">
            <div>SU</div>

            <h3>No sales users yet</h3>

            <p>
              {hasSalesAccess
                ? "Create your first sales account using the secure form above."
                : "Upgrade your subscription to begin adding sales users."}
            </p>
          </div>
        ) : null}

        {!loading &&
        salesUsers.length > 0 &&
        filteredSalesUsers.length === 0 ? (
          <div className="cp-sales-team-empty">
            <div>⌕</div>

            <h3>No matching accounts</h3>

            <p>
              Change the search phrase or status filter to see
              more sales users.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : null}

        {!loading && filteredSalesUsers.length > 0 ? (
          <div className="cp-sales-team-member-grid">
            {filteredSalesUsers.map((salesUser) => {
              const active = isActiveSalesUser(
                salesUser.status
              );

              const isUpdating =
                updatingUserId === salesUser.id;

              const canReactivate =
                activeCount < salesUserLimit;

              return (
                <article
                  className={`cp-sales-team-member-card ${
                    active ? "is-active" : "is-inactive"
                  }`}
                  key={salesUser.id}
                >
                  <div className="cp-sales-team-member-head">
                    <div className="cp-sales-team-avatar">
                      {getInitials(salesUser.name)}
                    </div>

                    <div>
                      <span>Sales account</span>
                      <h3>{salesUser.name}</h3>
                    </div>

                    <span
                      className={`cp-sales-team-member-status ${
                        active ? "active" : "inactive"
                      }`}
                    >
                      <i />
                      {salesUser.status || "Unknown"}
                    </span>
                  </div>

                  <div className="cp-sales-team-member-id">
                    <span>Staff ID</span>

                    <div>
                      <code>{salesUser.staff_id}</code>

                      <button
                        type="button"
                        onClick={() =>
                          void copyText(
                            salesUser.staff_id,
                            "Staff ID copied successfully."
                          )
                        }
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="cp-sales-team-member-details">
                    <div>
                      <span>Email</span>
                      <strong>
                        {salesUser.email ||
                          "Not provided"}
                      </strong>
                    </div>

                    <div>
                      <span>Phone</span>
                      <strong>
                        {salesUser.phone ||
                          "Not provided"}
                      </strong>
                    </div>

                    <div>
                      <span>Role</span>
                      <strong>
                        {salesUser.role || "Sales"}
                      </strong>
                    </div>

                    <div>
                      <span>Created</span>
                      <strong>
                        {formatDate(
                          salesUser.created_at
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="cp-sales-team-member-actions">
                    {active ? (
                      <button
                        type="button"
                        className="cp-sales-team-deactivate"
                        disabled={isUpdating}
                        onClick={() =>
                          void setStatus(
                            salesUser,
                            "inactive"
                          )
                        }
                      >
                        {isUpdating
                          ? "Updating..."
                          : "Deactivate access"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="cp-sales-team-reactivate"
                        disabled={
                          isUpdating ||
                          !canReactivate
                        }
                        onClick={() =>
                          void setStatus(
                            salesUser,
                            "active"
                          )
                        }
                      >
                        {isUpdating
                          ? "Updating..."
                          : canReactivate
                            ? "Reactivate access"
                            : "No active seat available"}
                      </button>
                    )}

                    <button
                      type="button"
                      className="cp-sales-team-reset-pin"
                      disabled={isUpdating}
                      onClick={() =>
                        void resetPin(salesUser)
                      }
                    >
                      Reset PIN
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="cp-sales-team-plans">
        <div className="cp-sales-team-plans-copy">
          <span>Sales-user limits</span>
          <h2>Choose the team size that fits your business.</h2>

          <p>
            Only active sales users consume seats. Inactive
            accounts remain available for historical records and
            can be reactivated when a seat becomes free.
          </p>
        </div>

        <div className="cp-sales-team-plan-options">
          <article
            className={
              normalizedPlan === "starter"
                ? "current"
                : ""
            }
          >
            <span>Starter</span>
            <strong>1</strong>
            <small>active sales user</small>
          </article>

          <article
            className={
              normalizedPlan === "pro"
                ? "current"
                : ""
            }
          >
            <span>Pro</span>
            <strong>2</strong>
            <small>active sales users</small>
          </article>

          <article
            className={
              normalizedPlan === "agency"
                ? "current"
                : ""
            }
          >
            <span>Agency</span>
            <strong>5</strong>
            <small>active sales users</small>
          </article>
        </div>

        <div className="cp-sales-team-plan-links">
          <Link href="/dashboard/subscription">
            Manage subscription
          </Link>

          <Link href="/contact">
            Contact Makzora
          </Link>
        </div>
      </section>
    </div>
  );
}