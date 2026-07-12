"use client";

import { useEffect, useMemo, useState } from "react";

type Client = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

type Meeting = {
  id: string;
  title: string;
  summary?: string | null;
  created_at?: string | null;
};

type Reminder = {
  id: string;
  title: string;
  client_name?: string | null;
  due_at: string;
  status: string;
  priority?: string | null;
};

type Proposal = {
  id: string;
  title: string;
  client_name?: string | null;
  amount?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SalesStaffWorkspaceProps = {
  staffName: string;
  staffId: string;
};

type ActiveTab = "clients" | "meetings" | "reminders" | "proposals";

function toDateTimeLocal(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value?: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatAmount(value?: number | null) {
  if (!value) return "Amount not confirmed";
  return value.toLocaleString();
}

export function SalesStaffWorkspace({ staffName, staffId }: SalesStaffWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("clients");

  const [clients, setClients] = useState<Client[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  const [meetingTitle, setMeetingTitle] = useState("Client meeting");
  const [meetingClientId, setMeetingClientId] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingResult, setMeetingResult] = useState<any>(null);

  const [reminderClientId, setReminderClientId] = useState("");
  const [reminderTitle, setReminderTitle] = useState("Send proposal");
  const [reminderType, setReminderType] = useState("proposal");
  const [reminderPriority, setReminderPriority] = useState("high");
  const [reminderDueAt, setReminderDueAt] = useState(toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
  const [reminderNotes, setReminderNotes] = useState("");

  const [proposalClientId, setProposalClientId] = useState("");
  const [proposalTitle, setProposalTitle] = useState("Project Proposal");
  const [proposalAmount, setProposalAmount] = useState("");
  const [proposalNotes, setProposalNotes] = useState("");
  const [proposalResult, setProposalResult] = useState<Proposal | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedReminderClient = useMemo(
    () => clients.find((client) => client.id === reminderClientId),
    [clients, reminderClientId]
  );

  async function loadAll() {
    setLoading(true);

    try {
      const [clientsResponse, meetingsResponse, remindersResponse, proposalsResponse] = await Promise.all([
        fetch("/clientpilotai/api/sales-workspace/clients", { cache: "no-store" }),
        fetch("/clientpilotai/api/sales-workspace/meetings", { cache: "no-store" }),
        fetch("/clientpilotai/api/sales-workspace/reminders", { cache: "no-store" }),
        fetch("/clientpilotai/api/sales-workspace/proposals", { cache: "no-store" })
      ]);

      const clientsData = await clientsResponse.json();
      const meetingsData = await meetingsResponse.json();
      const remindersData = await remindersResponse.json();
      const proposalsData = await proposalsResponse.json();

      const loadedClients = clientsData.clients || [];

      setClients(loadedClients);
      setMeetings(meetingsData.meetings || []);
      setReminders(remindersData.reminders || []);
      setProposals(proposalsData.proposals || []);

      if (!meetingClientId && loadedClients[0]?.id) {
        setMeetingClientId(loadedClients[0].id);
      }

      if (!proposalClientId && loadedClients[0]?.id) {
        setProposalClientId(loadedClients[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/clientpilotai/api/sales-workspace/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: clientName,
          phone: clientPhone,
          email: clientEmail,
          address: clientAddress
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to add client.");
        return;
      }

      setClientName("");
      setClientPhone("");
      setClientEmail("");
      setClientAddress("");
      setMessage("Client added successfully.");
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function createMeeting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setMeetingResult(null);

    try {
      const response = await fetch("/clientpilotai/api/sales-workspace/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: meetingTitle,
          client_id: meetingClientId,
          notes: meetingNotes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to process meeting.");
        return;
      }

      setMeetingResult(data);
      setMeetingNotes("");
      setMessage("Meeting summary and tasks created.");
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function createReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/clientpilotai/api/sales-workspace/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: selectedReminderClient?.id || null,
          client_name: selectedReminderClient?.name || null,
          client_phone: selectedReminderClient?.phone || null,
          title: reminderTitle,
          reminder_type: reminderType,
          priority: reminderPriority,
          due_at: new Date(reminderDueAt).toISOString(),
          notes: reminderNotes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to create reminder.");
        return;
      }

      setReminderNotes("");
      setMessage("Reminder created successfully.");
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function createProposal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setProposalResult(null);

    try {
      const response = await fetch("/clientpilotai/api/sales-workspace/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: proposalClientId,
          title: proposalTitle,
          amount: proposalAmount,
          notes: proposalNotes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to create proposal.");
        return;
      }

      setProposalResult(data.proposal);
      setProposalNotes("");
      setProposalAmount("");
      setMessage("Proposal created and sent to owner workspace.");
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/clientpilotai/api/sales-auth/logout", { method: "POST" });
    window.location.href = "/sales/login";
  }

  const heroTitle =
    activeTab === "clients"
      ? "Manage clients"
      : activeTab === "meetings"
        ? "Process meetings"
        : activeTab === "reminders"
          ? "Create reminders"
          : "Create proposals";

  const heroCount =
    activeTab === "clients"
      ? clients.length
      : activeTab === "meetings"
        ? meetings.length
        : activeTab === "reminders"
          ? reminders.length
          : proposals.length;

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

        <nav className="sales-tabs">
          <button onClick={() => setActiveTab("clients")} className={activeTab === "clients" ? "active" : ""}>Clients</button>
          <button onClick={() => setActiveTab("meetings")} className={activeTab === "meetings" ? "active" : ""}>Meetings</button>
          <button onClick={() => setActiveTab("reminders")} className={activeTab === "reminders" ? "active" : ""}>Reminders</button>
          <button onClick={() => setActiveTab("proposals")} className={activeTab === "proposals" ? "active" : ""}>Proposals</button>
        </nav>

        <button onClick={logout}>Logout</button>
      </aside>

      <section className="sales-workspace-main">
        <div className="page-hero">
          <div>
            <span className="badge">Sales Dashboard</span>
            <h1 style={{ fontSize: 46 }}>{heroTitle}</h1>
            <p className="muted">
              Sales users can add clients, process meeting notes, schedule follow-ups, and create proposal drafts under the owner workspace.
            </p>
          </div>

          <div className="hero-mini-card">
            <strong>{heroCount}</strong>
            <span>{activeTab}</span>
          </div>
        </div>

        {message ? (
          <p className={message.includes("Unable") || message.includes("required") ? "auth-error" : "auth-message"}>
            {message}
          </p>
        ) : null}

        {activeTab === "clients" ? (
          <div className="sales-workspace-grid">
            <section className="sales-client-form-card">
              <h2>Add client</h2>

              <form onSubmit={createClient} className="sales-client-form">
                <label>Client name<input value={clientName} onChange={(event) => setClientName(event.target.value)} required /></label>
                <label>Phone<input value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} /></label>
                <label>Email<input value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} /></label>
                <label>Address / Company<input value={clientAddress} onChange={(event) => setClientAddress(event.target.value)} /></label>

                <button disabled={saving}>{saving ? "Adding..." : "Add Client"}</button>
              </form>
            </section>

            <section className="sales-client-list-card">
              <h2>Recent clients</h2>

              {loading ? <p className="muted">Loading clients...</p> : null}

              <div className="sales-client-list">
                {clients.map((client) => (
                  <article key={client.id}>
                    <h3>{client.name}</h3>
                    <p>{client.phone || "No phone"} - {client.email || "No email"}</p>
                    {client.address ? <span>{client.address}</span> : null}
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "meetings" ? (
          <div className="sales-workspace-grid">
            <section className="sales-client-form-card">
              <h2>Add meeting notes</h2>

              <form onSubmit={createMeeting} className="sales-client-form">
                <label>
                  Client
                  <select value={meetingClientId} onChange={(event) => setMeetingClientId(event.target.value)} required>
                    {clients.map((client) => (
                      <option value={client.id} key={client.id}>{client.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Meeting title
                  <input value={meetingTitle} onChange={(event) => setMeetingTitle(event.target.value)} required />
                </label>

                <label>
                  Meeting notes
                  <textarea value={meetingNotes} onChange={(event) => setMeetingNotes(event.target.value)} required />
                </label>

                <button disabled={saving || clients.length === 0}>{saving ? "Processing..." : "Create Summary + Tasks"}</button>
              </form>
            </section>

            <section className="sales-client-list-card">
              <h2>Recent meetings</h2>

              {meetingResult ? (
                <div className="sales-meeting-result">
                  <span className="badge">Created</span>
                  <h3>Summary</h3>
                  <pre>{meetingResult.summary}</pre>
                  <p className="muted">Tasks created: {meetingResult.tasksCreated}</p>
                </div>
              ) : null}

              <div className="sales-client-list">
                {meetings.map((meeting) => (
                  <article key={meeting.id}>
                    <h3>{meeting.title}</h3>
                    <p>{formatDate(meeting.created_at)}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "reminders" ? (
          <div className="sales-workspace-grid">
            <section className="sales-client-form-card">
              <h2>Create reminder</h2>

              <form onSubmit={createReminder} className="sales-client-form">
                <label>
                  Client
                  <select value={reminderClientId} onChange={(event) => setReminderClientId(event.target.value)}>
                    <option value="">General reminder</option>
                    {clients.map((client) => (
                      <option value={client.id} key={client.id}>{client.name}</option>
                    ))}
                  </select>
                </label>

                <label>Title<input value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} required /></label>

                <label>
                  Type
                  <select value={reminderType} onChange={(event) => setReminderType(event.target.value)}>
                    <option value="proposal">Send proposal</option>
                    <option value="call">Call client</option>
                    <option value="whatsapp">WhatsApp follow-up</option>
                    <option value="payment">Payment follow-up</option>
                  </select>
                </label>

                <label>
                  Priority
                  <select value={reminderPriority} onChange={(event) => setReminderPriority(event.target.value)}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>

                <label>
                  Date and time
                  <input type="datetime-local" value={reminderDueAt} onChange={(event) => setReminderDueAt(event.target.value)} required />
                </label>

                <label>Notes<input value={reminderNotes} onChange={(event) => setReminderNotes(event.target.value)} /></label>

                <button disabled={saving}>{saving ? "Saving..." : "Create Reminder"}</button>
              </form>
            </section>

            <section className="sales-client-list-card">
              <h2>Upcoming reminders</h2>

              <div className="sales-client-list">
                {reminders.map((reminder) => (
                  <article key={reminder.id}>
                    <h3>{reminder.title}</h3>
                    <p>{reminder.client_name ? `${reminder.client_name} - ` : ""}{formatDate(reminder.due_at)}</p>
                    <span>{reminder.priority || "medium"} - {reminder.status}</span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "proposals" ? (
          <div className="sales-workspace-grid">
            <section className="sales-client-form-card">
              <h2>Create proposal</h2>

              <form onSubmit={createProposal} className="sales-client-form">
                <label>
                  Client
                  <select value={proposalClientId} onChange={(event) => setProposalClientId(event.target.value)} required>
                    {clients.map((client) => (
                      <option value={client.id} key={client.id}>{client.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Proposal title
                  <input value={proposalTitle} onChange={(event) => setProposalTitle(event.target.value)} required />
                </label>

                <label>
                  Amount optional
                  <input value={proposalAmount} onChange={(event) => setProposalAmount(event.target.value)} placeholder="Example: 5000" />
                </label>

                <label>
                  Proposal notes
                  <textarea value={proposalNotes} onChange={(event) => setProposalNotes(event.target.value)} placeholder="Paste meeting notes, scope, client need, or quotation details." />
                </label>

                <button disabled={saving || clients.length === 0}>{saving ? "Creating..." : "Create Proposal"}</button>
              </form>
            </section>

            <section className="sales-client-list-card">
              <h2>Recent proposals</h2>

              {proposalResult ? (
                <div className="sales-meeting-result">
                  <span className="badge">Created</span>
                  <h3>{proposalResult.title}</h3>
                  <p className="muted">Status: {proposalResult.status}</p>
                  <p className="muted">Owner can review it in dashboard proposals.</p>
                </div>
              ) : null}

              <div className="sales-client-list">
                {proposals.map((proposal) => (
                  <article key={proposal.id}>
                    <h3>{proposal.title}</h3>
                    <p>{proposal.client_name || "No client"} - {formatDate(proposal.updated_at || proposal.created_at)}</p>
                    <span>{proposal.status || "draft"} - {formatAmount(proposal.amount)}</span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}


