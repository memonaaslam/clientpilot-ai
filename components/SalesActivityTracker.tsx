"use client";

import { useEffect, useState } from "react";
type ActivityRow = {
  id: string;
  staff_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  clientsAdded: number;
  meetingsAdded: number;
  tasksCreated: number;
  remindersCreated: number;
  proposalsCreated: number;
  followUpsDue: number;
  completedTasks: number;
  activityScore: number;
};

type Totals = {
  salesUsers: number;
  clientsAdded: number;
  meetingsAdded: number;
  tasksCreated: number;
  remindersCreated: number;
  proposalsCreated: number;
  followUpsDue: number;
};

export function SalesActivityTracker() {
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadActivity() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/clientpilotai/api/sales-activity", {
        cache: "no-store"
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to load sales activity.");
        return;
      }

      setActivity(result.activity || []);
      setTotals(result.totals || null);
    } catch {
      setError("Unable to load sales activity.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivity();
  }, []);

  return (
    <div className="sales-activity-page">
      <div className="page-hero sales-activity-hero">
        <div>
          <span className="badge">Sales Performance</span>
          <h1 style={{ fontSize: 48 }}>Track every sales person automatically</h1>
          <p className="muted">
            See clients, meetings, tasks, reminders, proposals, follow-ups due,
            and activity score for every sales user.
          </p>
        </div>

        <button onClick={loadActivity} className="sales-refresh-btn">
          Refresh
        </button>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}

      {loading ? <p className="muted">Loading sales activity...</p> : null}

      {totals ? (
        <section className="sales-activity-metrics">
          <article><span>Sales Users</span><strong>{totals.salesUsers}</strong></article>
          <article><span>Clients Added</span><strong>{totals.clientsAdded}</strong></article>
          <article><span>Meetings</span><strong>{totals.meetingsAdded}</strong></article>
          <article><span>Tasks</span><strong>{totals.tasksCreated}</strong></article>
          <article><span>Reminders</span><strong>{totals.remindersCreated}</strong></article>
          <article><span>Follow-ups Due</span><strong>{totals.followUpsDue}</strong></article>
        </section>
      ) : null}

      <section className="sales-activity-table-card">
        <div className="sales-activity-table-head">
          <h2>Team activity</h2>
          <p>Owner view of all sales users</p>
        </div>

        {!loading && activity.length === 0 ? (
          <div className="empty-state mini">
            <h2>No sales activity yet</h2>
            <p className="muted">
              Create sales users first. Activity will appear here when they add
              clients, meetings, reminders, tasks, and proposals.
            </p>
          </div>
        ) : null}

        <div className="sales-activity-table">
          <div className="sales-activity-row header">
            <span>Sales Person</span>
            <span>Clients</span>
            <span>Meetings</span>
            <span>Tasks</span>
            <span>Reminders</span>
            <span>Proposals</span>
            <span>Due</span>
            <span>Score</span>
          </div>

          {activity.map((user) => (
            <div className="sales-activity-row" key={user.id}>
              <span>
                <b>{user.name}</b>
                <small>{user.staff_id} · {user.status}</small>
              </span>
              <span>{user.clientsAdded}</span>
              <span>{user.meetingsAdded}</span>
              <span>{user.tasksCreated}</span>
              <span>{user.remindersCreated}</span>
              <span>{user.proposalsCreated}</span>
              <span>{user.followUpsDue}</span>
              <span>
                <strong>{user.activityScore}%</strong>
                <div className="score-bar">
                  <i style={{ width: `${user.activityScore}%` }} />
                </div>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

