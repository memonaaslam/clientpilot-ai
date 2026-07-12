"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

function formatDate(value?: string | null) {
  if (!value) return "Recently created";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently created";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function SalesTeamManager({
  currentPlan
}: SalesTeamManagerProps) {
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(
    null
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [message, setMessage] = useState("");
  const [newAccess, setNewAccess] = useState<{
    staffId: string;
    pin: string;
  } | null>(null);

  const normalizedPlan = normalizePlan(currentPlan);
  const planLabel = PLAN_LABELS[normalizedPlan];
  const salesUserLimit = SALES_USER_LIMITS[normalizedPlan];

  const activeCount = useMemo(
    () =>
      salesUsers.filter((salesUser) => salesUser.status === "active")
        .length,
    [salesUsers]
  );

  const remainingSeats = Math.max(
    salesUserLimit - activeCount,
    0
  );

  const hasSalesAccess = salesUserLimit > 0;
  const limitReached =
    hasSalesAccess && activeCount >= salesUserLimit;

  async function loadSalesUsers() {
    setLoading(true);

    try {
      const response = await fetch(
        "/clientpilotai/api/sales-users",
        {
          cache: "no-store"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to load sales users.");
        setSalesUsers([]);
        return;
      }

      setSalesUsers(data.salesUsers || []);
    } catch {
      setMessage("Unable to connect to the sales users service.");
      setSalesUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSalesUsers();
  }, []);

  async function createSalesUser(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!hasSalesAccess || limitReached) {
      return;
    }

    setSaving(true);
    setMessage("");
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
        setMessage(
          data.error || "Unable to create sales user."
        );
        return;
      }

      setNewAccess({
        staffId: data.salesUser.staff_id,
        pin: data.temporaryPin
      });

      setName("");
      setEmail("");
      setPhone("");
      setMessage("Sales user created successfully.");

      await loadSalesUsers();
    } catch {
      setMessage(
        "Unable to connect to the sales user service."
      );
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: string) {
    setUpdatingUserId(id);
    setMessage("");

    try {
      const response = await fetch(
        `/clientpilotai/api/sales-users/${id}`,
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
        setMessage(
          data.error || "Unable to update sales user."
        );
        return;
      }

      setMessage(
        status === "active"
          ? "Sales user reactivated successfully."
          : "Sales user deactivated successfully."
      );

      await loadSalesUsers();
    } catch {
      setMessage(
        "Unable to connect to the sales user service."
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function resetPin(id: string) {
    const confirmReset = window.confirm(
      "Reset PIN for this sales person?"
    );

    if (!confirmReset) return;

    setUpdatingUserId(id);
    setMessage("");
    setNewAccess(null);

    try {
      const response = await fetch(
        `/clientpilotai/api/sales-users/${id}`,
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
        setMessage(data.error || "Unable to reset PIN.");
        return;
      }

      setNewAccess({
        staffId: data.salesUser.staff_id,
        pin: data.temporaryPin
      });

      setMessage("New PIN generated successfully.");
    } catch {
      setMessage(
        "Unable to connect to the sales user service."
      );
    } finally {
      setUpdatingUserId(null);
    }
  }

  const messageIsError =
    message.toLowerCase().includes("unable") ||
    message.toLowerCase().includes("does not include") ||
    message.toLowerCase().includes("allows") ||
    message.toLowerCase().includes("upgrade");

  return (
    <div className="sales-team-layout">
      <section className="sales-team-hero">
        <div>
          <span className="badge">
            {planLabel} Sales Team
          </span>

          <h2>Owner + sales users workspace</h2>

          <p>
            Your {planLabel} plan includes{" "}
            {salesUserLimit === 0
              ? "no sales users"
              : `${salesUserLimit} active sales user${
                  salesUserLimit === 1 ? "" : "s"
                }`}
            . Each sales person receives a unique Staff ID and
            PIN for their own sales workspace.
          </p>
        </div>

        <div className="seat-meter-card">
          <strong>
            {activeCount}/{salesUserLimit}
          </strong>

          <span>Included sales seats used</span>
        </div>
      </section>

      {!hasSalesAccess ? (
        <section className="upgrade-team-card">
          <span className="badge">Upgrade Required</span>

          <h3>Upgrade to unlock sales users</h3>

          <p>
            Starter includes 1 sales user, Pro includes 2 sales
            users, and Agency includes 5 sales users.
          </p>

          <Link
            href="/dashboard/subscription"
            className="btn gold"
          >
            View Plans
          </Link>
        </section>
      ) : null}

      <section className="sales-user-form-card">
        <div className="section-head">
          <div>
            <span className="badge">Create Sales User</span>

            <h3>Add a sales person</h3>

            <p className="muted">
              The PIN is shown once only. Save it and share it
              privately with your sales person.
            </p>
          </div>
        </div>

        <form
          className="sales-user-form"
          onSubmit={createSalesUser}
        >
          <label>
            Sales person name
            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              disabled={
                !hasSalesAccess || limitReached || saving
              }
            />
          </label>

          <label>
            Email optional
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              disabled={
                !hasSalesAccess || limitReached || saving
              }
            />
          </label>

          <label>
            Phone optional
            <input
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value)
              }
              disabled={
                !hasSalesAccess || limitReached || saving
              }
            />
          </label>

          {message ? (
            <p
              className={
                messageIsError
                  ? "auth-error"
                  : "auth-message"
              }
            >
              {message}
            </p>
          ) : null}

          {newAccess ? (
            <div className="sales-access-box">
              <span className="badge">Save This Login</span>

              <h4>Sales user access created</h4>

              <div>
                <strong>Staff ID</strong>
                <code>{newAccess.staffId}</code>
              </div>

              <div>
                <strong>PIN</strong>
                <code>{newAccess.pin}</code>
              </div>

              <p>This PIN will not be shown again.</p>
            </div>
          ) : null}

          <button
            className="btn gold"
            disabled={
              !hasSalesAccess || limitReached || saving
            }
          >
            {saving
              ? "Creating..."
              : !hasSalesAccess
                ? "Upgrade Required"
                : limitReached
                  ? `${salesUserLimit} Seat${
                      salesUserLimit === 1 ? "" : "s"
                    } Used`
                  : "Generate Staff ID + PIN"}
          </button>

          {hasSalesAccess && !limitReached ? (
            <p className="muted">
              {remainingSeats} sales seat
              {remainingSeats === 1 ? "" : "s"} remaining.
            </p>
          ) : null}
        </form>
      </section>

      <section className="sales-user-list-card">
        <div className="section-head">
          <div>
            <span className="badge">Sales Users</span>
            <h3>Team access</h3>
          </div>
        </div>

        {loading ? (
          <p className="muted">Loading sales users...</p>
        ) : null}

        {!loading && salesUsers.length === 0 ? (
          <div className="empty-state mini">
            <h2>No sales users yet</h2>

            <p className="muted">
              {hasSalesAccess
                ? "Create your first sales user using the form above."
                : "Upgrade your plan to create sales users."}
            </p>
          </div>
        ) : null}

        <div className="sales-user-list">
          {salesUsers.map((salesUser) => {
            const isUpdating =
              updatingUserId === salesUser.id;

            return (
              <article
                className="sales-user-row"
                key={salesUser.id}
              >
                <div>
                  <span
                    className={
                      salesUser.status === "active"
                        ? "sales-status active"
                        : "sales-status inactive"
                    }
                  >
                    {salesUser.status}
                  </span>

                  <h4>{salesUser.name}</h4>

                  <p>
                    Staff ID:{" "}
                    <strong>{salesUser.staff_id}</strong>
                  </p>

                  <small>
                    {salesUser.email
                      ? `${salesUser.email} · `
                      : ""}
                    {formatDate(salesUser.created_at)}
                  </small>
                </div>

                <div className="sales-user-actions">
                  {salesUser.status === "active" ? (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() =>
                        void setStatus(
                          salesUser.id,
                          "inactive"
                        )
                      }
                    >
                      {isUpdating
                        ? "Updating..."
                        : "Deactivate"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        isUpdating ||
                        activeCount >= salesUserLimit
                      }
                      onClick={() =>
                        void setStatus(
                          salesUser.id,
                          "active"
                        )
                      }
                    >
                      {isUpdating
                        ? "Updating..."
                        : "Reactivate"}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() =>
                      void resetPin(salesUser.id)
                    }
                  >
                    Reset PIN
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="custom-sales-addon-card">
        <div>
          <span className="badge">Sales Team Limits</span>

          <h3>Need more sales users?</h3>

          <p>
            Starter includes 1 sales user, Pro includes 2, and
            Agency includes 5. Contact Makzora for a custom
            enterprise team plan.
          </p>
        </div>

        <Link href="/contact" className="btn secondary">
          Contact Makzora
        </Link>
      </section>
    </div>
  );
}