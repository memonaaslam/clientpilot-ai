"use client";

import { useEffect, useMemo, useState } from "react";

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

type StatusFilter = "all" | "active" | "inactive";

type SortOption =
  | "score"
  | "clients"
  | "meetings"
  | "tasks"
  | "name";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Number(score) || 0));
}

function isActiveStatus(status?: string | null) {
  const normalizedStatus = String(status || "").toLowerCase();

  return (
    normalizedStatus === "active" ||
    normalizedStatus === "enabled" ||
    normalizedStatus === "online"
  );
}

function getScoreLabel(score: number) {
  if (score >= 85) {
    return "Excellent";
  }

  if (score >= 70) {
    return "Strong";
  }

  if (score >= 50) {
    return "Developing";
  }

  return "Needs attention";
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

export function SalesActivityTracker() {
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadActivity(mode: "initial" | "refresh" = "initial") {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch(
        "/clientpilotai/api/sales-activity",
        {
          cache: "no-store"
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to load sales activity."
        );
      }

      setActivity(
        Array.isArray(result.activity) ? result.activity : []
      );

      setTotals(result.totals || null);
      setLastUpdated(new Date());
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load sales activity.";

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadActivity();
  }, []);

  const activeUsers = useMemo(
    () =>
      activity.filter((user) => isActiveStatus(user.status)).length,
    [activity]
  );

  const averageScore = useMemo(() => {
    if (activity.length === 0) {
      return 0;
    }

    const scoreTotal = activity.reduce(
      (sum, user) => sum + clampScore(user.activityScore),
      0
    );

    return Math.round(scoreTotal / activity.length);
  }, [activity]);

  const topPerformer = useMemo(() => {
    if (activity.length === 0) {
      return null;
    }

    return activity.reduce((bestUser, currentUser) =>
      clampScore(currentUser.activityScore) >
      clampScore(bestUser.activityScore)
        ? currentUser
        : bestUser
    );
  }, [activity]);

  const totalRecordedActions = useMemo(
    () =>
      (totals?.clientsAdded || 0) +
      (totals?.meetingsAdded || 0) +
      (totals?.tasksCreated || 0) +
      (totals?.remindersCreated || 0) +
      (totals?.proposalsCreated || 0),
    [totals]
  );

  const filteredActivity = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filteredUsers = activity.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.staff_id.toLowerCase().includes(normalizedSearch) ||
        String(user.email || "")
          .toLowerCase()
          .includes(normalizedSearch);

      const userIsActive = isActiveStatus(user.status);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && userIsActive) ||
        (statusFilter === "inactive" && !userIsActive);

      return matchesSearch && matchesStatus;
    });

    return [...filteredUsers].sort((firstUser, secondUser) => {
      if (sortBy === "name") {
        return firstUser.name.localeCompare(secondUser.name);
      }

      if (sortBy === "clients") {
        return secondUser.clientsAdded - firstUser.clientsAdded;
      }

      if (sortBy === "meetings") {
        return secondUser.meetingsAdded - firstUser.meetingsAdded;
      }

      if (sortBy === "tasks") {
        return secondUser.tasksCreated - firstUser.tasksCreated;
      }

      return (
        clampScore(secondUser.activityScore) -
        clampScore(firstUser.activityScore)
      );
    });
  }, [activity, searchQuery, statusFilter, sortBy]);

  return (
    <div className="cp-sales-activity-page">
      <section className="cp-sales-activity-hero">
        <div className="cp-sales-activity-hero-copy">
          <span className="cp-sales-activity-eyebrow">
            ClientPilot AI Sales Activity
          </span>

          <h1>See how your sales team is performing.</h1>

          <p>
            Monitor clients, meetings, tasks, reminders, proposals
            and follow-ups from one premium owner view.
          </p>

          <div className="cp-sales-activity-hero-meta">
            <span>
              <i />
              Live workspace data
            </span>

            <span>
              Updated{" "}
              {lastUpdated
                ? lastUpdated.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                : "when loaded"}
            </span>
          </div>
        </div>

        <div className="cp-sales-activity-hero-side">
          <article className="cp-sales-activity-score-card">
            <div className="cp-sales-score-ring">
              <strong>{averageScore}%</strong>
              <span>Average</span>
            </div>

            <div>
              <span>Team performance</span>
              <h2>{getScoreLabel(averageScore)}</h2>
              <p>
                Average activity score across all registered sales
                users.
              </p>
            </div>
          </article>

          <button
            type="button"
            className="cp-sales-activity-refresh"
            onClick={() => void loadActivity("refresh")}
            disabled={loading || refreshing}
          >
            <span>{refreshing ? "..." : "↻"}</span>

            <div>
              <strong>
                {refreshing ? "Refreshing activity" : "Refresh data"}
              </strong>
              <small>Load the latest workspace activity</small>
            </div>
          </button>
        </div>
      </section>

      {error ? (
        <div className="cp-sales-activity-error" role="alert">
          <span>!</span>
          <p>{error}</p>

          <button
            type="button"
            onClick={() => void loadActivity("refresh")}
          >
            Try again
          </button>
        </div>
      ) : null}

      {loading ? (
        <section className="cp-sales-activity-loading">
          <div className="cp-sales-activity-loading-grid">
            {Array.from({ length: 7 }).map((_, index) => (
              <article key={index}>
                <span />
                <strong />
                <small />
              </article>
            ))}
          </div>

          <div className="cp-sales-activity-loading-table">
            <span />
            <span />
            <span />
            <span />
          </div>
        </section>
      ) : null}

      {!loading && totals ? (
        <>
          <section className="cp-sales-activity-kpis">
            <article>
              <div className="cp-sales-kpi-icon">SU</div>
              <span>Sales users</span>
              <strong>{totals.salesUsers}</strong>
              <small>{activeUsers} currently active</small>
            </article>

            <article>
              <div className="cp-sales-kpi-icon">CL</div>
              <span>Clients added</span>
              <strong>{totals.clientsAdded}</strong>
              <small>New client records</small>
            </article>

            <article>
              <div className="cp-sales-kpi-icon">MT</div>
              <span>Meetings</span>
              <strong>{totals.meetingsAdded}</strong>
              <small>Recorded discussions</small>
            </article>

            <article>
              <div className="cp-sales-kpi-icon">TK</div>
              <span>Tasks created</span>
              <strong>{totals.tasksCreated}</strong>
              <small>Assigned actions</small>
            </article>

            <article>
              <div className="cp-sales-kpi-icon">RM</div>
              <span>Reminders</span>
              <strong>{totals.remindersCreated}</strong>
              <small>Scheduled follow-through</small>
            </article>

            <article>
              <div className="cp-sales-kpi-icon">PR</div>
              <span>Proposals</span>
              <strong>{totals.proposalsCreated}</strong>
              <small>Prepared opportunities</small>
            </article>

            <article
              className={
                totals.followUpsDue > 0
                  ? "cp-sales-kpi-attention"
                  : ""
              }
            >
              <div className="cp-sales-kpi-icon">FU</div>
              <span>Follow-ups due</span>
              <strong>{totals.followUpsDue}</strong>
              <small>
                {totals.followUpsDue > 0
                  ? "Needs team attention"
                  : "Nothing overdue"}
              </small>
            </article>
          </section>

          <section className="cp-sales-activity-insights">
            <article className="cp-sales-top-performer-card">
              <div className="cp-sales-insight-heading">
                <div>
                  <span>Top performer</span>
                  <h2>Team leader</h2>
                </div>

                <span className="cp-sales-insight-number">01</span>
              </div>

              {topPerformer ? (
                <div className="cp-sales-top-performer">
                  <div className="cp-sales-activity-avatar">
                    {getInitials(topPerformer.name)}
                  </div>

                  <div>
                    <strong>{topPerformer.name}</strong>
                    <span>
                      {topPerformer.staff_id} ·{" "}
                      {topPerformer.status || "Unknown"}
                    </span>
                  </div>

                  <div className="cp-sales-top-score">
                    <strong>
                      {clampScore(topPerformer.activityScore)}%
                    </strong>
                    <span>
                      {getScoreLabel(
                        clampScore(topPerformer.activityScore)
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="cp-sales-insight-empty">
                  Performance data will appear after sales activity
                  is recorded.
                </p>
              )}
            </article>

            <article className="cp-sales-summary-card">
              <div className="cp-sales-insight-heading">
                <div>
                  <span>Workspace activity</span>
                  <h2>Total actions</h2>
                </div>
              </div>

              <strong className="cp-sales-summary-total">
                {totalRecordedActions}
              </strong>

              <p>
                Combined clients, meetings, tasks, reminders and
                proposals created by the sales team.
              </p>
            </article>

            <article
              className={`cp-sales-followup-card ${
                totals.followUpsDue > 0 ? "attention" : ""
              }`}
            >
              <div className="cp-sales-insight-heading">
                <div>
                  <span>Follow-up health</span>
                  <h2>
                    {totals.followUpsDue > 0
                      ? "Action required"
                      : "On track"}
                  </h2>
                </div>
              </div>

              <strong className="cp-sales-summary-total">
                {totals.followUpsDue}
              </strong>

              <p>
                {totals.followUpsDue > 0
                  ? "Open the Follow-ups area and contact these clients before opportunities become cold."
                  : "The sales team currently has no outstanding follow-ups."}
              </p>
            </article>
          </section>

          <section className="cp-sales-activity-team-card">
            <div className="cp-sales-activity-team-header">
              <div>
                <span>Sales performance directory</span>
                <h2>Team activity</h2>
                <p>
                  Review individual sales output and identify where
                  support is needed.
                </p>
              </div>

              <div className="cp-sales-result-count">
                <strong>{filteredActivity.length}</strong>
                <span>people shown</span>
              </div>
            </div>

            <div className="cp-sales-activity-toolbar">
              <label className="cp-sales-activity-search">
                <span>⌕</span>

                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  placeholder="Search name, staff ID or email"
                />
              </label>

              <div className="cp-sales-status-filters">
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
                    statusFilter === "active" ? "active" : ""
                  }
                  onClick={() => setStatusFilter("active")}
                >
                  Active
                </button>

                <button
                  type="button"
                  className={
                    statusFilter === "inactive" ? "active" : ""
                  }
                  onClick={() => setStatusFilter("inactive")}
                >
                  Inactive
                </button>
              </div>

              <label className="cp-sales-sort-control">
                <span>Sort by</span>

                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as SortOption)
                  }
                >
                  <option value="score">Highest score</option>
                  <option value="clients">Most clients</option>
                  <option value="meetings">Most meetings</option>
                  <option value="tasks">Most tasks</option>
                  <option value="name">Name A–Z</option>
                </select>
              </label>
            </div>

            {activity.length === 0 ? (
              <div className="cp-sales-activity-empty">
                <div>SU</div>
                <h3>No sales activity yet</h3>
                <p>
                  Create sales users first. Their clients, meetings,
                  tasks, reminders and proposals will appear here
                  automatically.
                </p>
              </div>
            ) : null}

            {activity.length > 0 &&
            filteredActivity.length === 0 ? (
              <div className="cp-sales-activity-empty">
                <div>⌕</div>
                <h3>No matching sales users</h3>
                <p>
                  Change the search phrase or status filter to view
                  more team members.
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

            {filteredActivity.length > 0 ? (
              <>
                <div className="cp-sales-activity-table-wrap">
                  <div className="cp-sales-activity-table">
                    <div className="cp-sales-activity-table-row header">
                      <span>Sales person</span>
                      <span>Status</span>
                      <span>Clients</span>
                      <span>Meetings</span>
                      <span>Tasks</span>
                      <span>Reminders</span>
                      <span>Proposals</span>
                      <span>Due</span>
                      <span>Performance</span>
                    </div>

                    {filteredActivity.map((user) => {
                      const score = clampScore(user.activityScore);
                      const userIsActive = isActiveStatus(
                        user.status
                      );

                      return (
                        <article
                          className="cp-sales-activity-table-row"
                          key={user.id}
                        >
                          <div className="cp-sales-user-identity">
                            <div className="cp-sales-activity-avatar">
                              {getInitials(user.name)}
                            </div>

                            <div>
                              <strong>{user.name}</strong>
                              <span>{user.staff_id}</span>
                              <small>
                                {user.email || "No email provided"}
                              </small>
                            </div>
                          </div>

                          <span
                            className={`cp-activity-user-status ${
                              userIsActive
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            <i />
                            {user.status || "Unknown"}
                          </span>

                          <strong>{user.clientsAdded}</strong>
                          <strong>{user.meetingsAdded}</strong>

                          <div className="cp-sales-number-detail">
                            <strong>{user.tasksCreated}</strong>
                            <small>
                              {user.completedTasks} completed
                            </small>
                          </div>

                          <strong>{user.remindersCreated}</strong>
                          <strong>{user.proposalsCreated}</strong>

                          <strong
                            className={
                              user.followUpsDue > 0
                                ? "cp-sales-due-number"
                                : ""
                            }
                          >
                            {user.followUpsDue}
                          </strong>

                          <div className="cp-sales-performance-cell">
                            <div>
                              <strong>{score}%</strong>
                              <span>{getScoreLabel(score)}</span>
                            </div>

                            <div className="cp-sales-score-track">
                              <i style={{ width: `${score}%` }} />
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                <div className="cp-sales-activity-mobile-list">
                  {filteredActivity.map((user) => {
                    const score = clampScore(user.activityScore);
                    const userIsActive = isActiveStatus(
                      user.status
                    );

                    return (
                      <article
                        className="cp-sales-activity-mobile-card"
                        key={user.id}
                      >
                        <div className="cp-sales-mobile-user-head">
                          <div className="cp-sales-activity-avatar">
                            {getInitials(user.name)}
                          </div>

                          <div>
                            <strong>{user.name}</strong>
                            <span>{user.staff_id}</span>
                          </div>

                          <span
                            className={`cp-activity-user-status ${
                              userIsActive
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            <i />
                            {user.status || "Unknown"}
                          </span>
                        </div>

                        <div className="cp-sales-mobile-metrics">
                          <div>
                            <span>Clients</span>
                            <strong>{user.clientsAdded}</strong>
                          </div>

                          <div>
                            <span>Meetings</span>
                            <strong>{user.meetingsAdded}</strong>
                          </div>

                          <div>
                            <span>Tasks</span>
                            <strong>{user.tasksCreated}</strong>
                          </div>

                          <div>
                            <span>Reminders</span>
                            <strong>{user.remindersCreated}</strong>
                          </div>

                          <div>
                            <span>Proposals</span>
                            <strong>{user.proposalsCreated}</strong>
                          </div>

                          <div>
                            <span>Follow-ups</span>
                            <strong>{user.followUpsDue}</strong>
                          </div>
                        </div>

                        <div className="cp-sales-mobile-score">
                          <div>
                            <span>Activity score</span>
                            <strong>{score}%</strong>
                          </div>

                          <div className="cp-sales-score-track">
                            <i style={{ width: `${score}%` }} />
                          </div>

                          <small>{getScoreLabel(score)}</small>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}