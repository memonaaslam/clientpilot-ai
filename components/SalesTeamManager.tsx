"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

function formatDate(value?: string | null) {
  if (!value) return "Recently created";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function SalesTeamManager({ currentPlan }: SalesTeamManagerProps) {
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [message, setMessage] = useState("");
  const [newAccess, setNewAccess] = useState<{ staffId: string; pin: string } | null>(null);

  const activeCount = salesUsers.filter((user) => user.status === "active").length;
  const isAgency = currentPlan === "agency";

  async function loadSalesUsers() {
    setLoading(true);

    try {
      const response = await fetch("/api/sales-users", { cache: "no-store" });
      const data = await response.json();
      setSalesUsers(data.salesUsers || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSalesUsers();
  }, []);

  async function createSalesUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setNewAccess(null);

    try {
      const response = await fetch("/api/sales-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, phone })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to create sales user.");
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
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: string) {
    const response = await fetch(`/api/sales-users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Unable to update sales user.");
      return;
    }

    await loadSalesUsers();
  }

  async function resetPin(id: string) {
    const confirmReset = window.confirm("Reset PIN for this sales person?");

    if (!confirmReset) return;

    const response = await fetch(`/api/sales-users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ reset_pin: true })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Unable to reset PIN.");
      return;
    }

    setNewAccess({
      staffId: data.salesUser.staff_id,
      pin: data.temporaryPin
    });

    setMessage("New PIN generated.");
  }

  return (
    <div className="sales-team-layout">
      <section className="sales-team-hero">
        <div>
          <span className="badge">Agency Sales Team</span>
          <h2>Owner + sales users workspace</h2>
          <p>
            Agency plan includes 3 active sales users. Each sales person gets a unique Staff ID and PIN.
            They will be able to add clients, meetings, tasks, reminders, and proposals in the sales workspace.
          </p>
        </div>

        <div className="seat-meter-card">
          <strong>{activeCount}/3</strong>
          <span>Included sales seats used</span>
        </div>
      </section>

      {!isAgency ? (
        <section className="upgrade-team-card">
          <span className="badge">Agency Feature</span>
          <h3>Upgrade to unlock sales users</h3>
          <p>
            Sales team access is available on the Agency plan. Starter and Pro are for solo users.
          </p>
          <Link href="/dashboard/subscription" className="btn gold">
            View Agency Plan
          </Link>
        </section>
      ) : null}

      <section className="sales-user-form-card">
        <div className="section-head">
          <div>
            <span className="badge">Create Sales User</span>
            <h3>Add a sales person</h3>
            <p className="muted">
              The PIN is shown once only. Save it and share privately with your sales person.
            </p>
          </div>
        </div>

        <form className="sales-user-form" onSubmit={createSalesUser}>
          <label>
            Sales person name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              
              required
              disabled={!isAgency || activeCount >= 3}
            />
          </label>

          <label>
            Email optional
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              
              disabled={!isAgency || activeCount >= 3}
            />
          </label>

          <label>
            Phone optional
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              
              disabled={!isAgency || activeCount >= 3}
            />
          </label>

          {message ? (
            <p className={message.includes("Unable") || message.includes("available") || message.includes("includes") ? "auth-error" : "auth-message"}>
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

          <button className="btn gold" disabled={!isAgency || activeCount >= 3 || saving}>
            {saving ? "Creating..." : activeCount >= 3 ? "3 Seats Used" : "Generate Staff ID + PIN"}
          </button>
        </form>
      </section>

      <section className="sales-user-list-card">
        <div className="section-head">
          <div>
            <span className="badge">Sales Users</span>
            <h3>Team access</h3>
          </div>
        </div>

        {loading ? <p className="muted">Loading sales users...</p> : null}

        {!loading && salesUsers.length === 0 ? (
          <div className="empty-state mini">
            <h2>No sales users yet</h2>
            <p className="muted">Create your first sales user when you are on Agency plan.</p>
          </div>
        ) : null}

        <div className="sales-user-list">
          {salesUsers.map((salesUser) => (
            <article className="sales-user-row" key={salesUser.id}>
              <div>
                <span className={salesUser.status === "active" ? "sales-status active" : "sales-status inactive"}>
                  {salesUser.status}
                </span>
                <h4>{salesUser.name}</h4>
                <p>
                  Staff ID: <strong>{salesUser.staff_id}</strong>
                </p>
                <small>
                  {salesUser.email ? `${salesUser.email} Â· ` : ""}
                  {formatDate(salesUser.created_at)}
                </small>
              </div>

              <div className="sales-user-actions">
                {salesUser.status === "active" ? (
                  <button type="button" onClick={() => setStatus(salesUser.id, "inactive")}>
                    Deactivate
                  </button>
                ) : (
                  <button type="button" onClick={() => setStatus(salesUser.id, "active")}>
                    Reactivate
                  </button>
                )}

                <button type="button" onClick={() => resetPin(salesUser.id)}>
                  Reset PIN
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="custom-sales-addon-card">
        <div>
          <span className="badge">Custom Team Add-On</span>
          <h3>Need more than 3 sales users?</h3>
          <p>
            Agency includes 3 sales users. Extra sales seats can be added with a custom monthly add-on,
            for example +$10/month per extra sales user.
          </p>
        </div>

        <Link href="/contact" className="btn secondary">
          Request Extra Seats
        </Link>
      </section>
    </div>
  );
}