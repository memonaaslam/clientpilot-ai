"use client";

import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

type SalesStaffWorkspaceProps = {
  staffName: string;
  staffId: string;
};

export function SalesStaffWorkspace({ staffName, staffId }: SalesStaffWorkspaceProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");

  async function loadClients() {
    setLoading(true);

    try {
      const response = await fetch("/api/sales-workspace/clients", { cache: "no-store" });
      const data = await response.json();
      setClients(data.clients || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function createClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/sales-workspace/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, phone, email, address })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to add client.");
        return;
      }

      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setMessage("Client added successfully.");
      await loadClients();
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/sales-auth/logout", { method: "POST" });
    window.location.href = "/sales/login";
  }

  return (
    <main className="sales-workspace-page">
      <aside className="sales-workspace-sidebar">
        <div className="sales-brand">
          <strong>ClientPilot</strong>
          <span>Sales Workspace</span>
        </div>

        <div className="sales-staff-card">
          <span className="badge">Sales User</span>
          <h3>{staffName}</h3>
          <p>{staffId}</p>
        </div>

        <button onClick={logout}>Logout</button>
      </aside>

      <section className="sales-workspace-main">
        <div className="page-hero">
          <div>
            <span className="badge">Sales Dashboard</span>
            <h1 style={{ fontSize: 46 }}>Add and manage clients</h1>
            <p className="muted">
              Add new clients for the owner workspace. Next step will add meetings, reminders, and proposals for sales users.
            </p>
          </div>

          <div className="hero-mini-card">
            <strong>{clients.length}</strong>
            <span>Clients</span>
          </div>
        </div>

        <div className="sales-workspace-grid">
          <section className="sales-client-form-card">
            <h2>Add client</h2>

            <form onSubmit={createClient} className="sales-client-form">
              <label>
                Client name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>

              <label>
                Phone
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+971500000000"
                />
              </label>

              <label>
                Email
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="client@example.com"
                />
              </label>

              <label>
                Address
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Client address"
                />
              </label>

              {message ? (
                <p className={message.includes("Unable") ? "auth-error" : "auth-message"}>
                  {message}
                </p>
              ) : null}

              <button disabled={saving}>
                {saving ? "Adding..." : "Add Client"}
              </button>
            </form>
          </section>

          <section className="sales-client-list-card">
            <h2>Recent clients</h2>

            {loading ? <p className="muted">Loading clients...</p> : null}

            {!loading && clients.length === 0 ? (
              <div className="empty-state mini">
                <h2>No clients yet</h2>
                <p className="muted">Add your first client from the form.</p>
              </div>
            ) : null}

            <div className="sales-client-list">
              {clients.map((client) => (
                <article key={client.id}>
                  <h3>{client.name}</h3>
                  <p>{client.phone || "No phone"} · {client.email || "No email"}</p>
                  {client.address ? <span>{client.address}</span> : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}