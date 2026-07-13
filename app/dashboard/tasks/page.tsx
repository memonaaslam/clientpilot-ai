import Link from "next/link";
import { revalidatePath } from "next/cache";

import { DashboardShell } from "@/components/DashboardShell";
import {
  PremiumEmptyState,
  ProgressMeter,
  StatusBadge
} from "@/components/PremiumUI";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type RelationName =
  | { id?: string; name?: string }
  | { id?: string; name?: string }[]
  | null;

type RelationTitle =
  | { title?: string }
  | { title?: string }[]
  | null;

type TaskRecord = {
  id: string;
  title: string;
  status: string | null;
  due_date?: string | null;
  due_at?: string | null;
  priority?: string | null;
  source?: string | null;
  notes?: string | null;
  client_id?: string | null;
  created_at: string;
  clients: RelationName;
  meetings: RelationTitle;
};

function getClient(
  value: RelationName
): {
  id: string | null;
  name: string;
} {
  const item = Array.isArray(value)
    ? value[0]
    : value;

  return {
    id: item?.id ? String(item.id) : null,
    name: item?.name || "No client"
  };
}

function getMeetingTitle(
  value: RelationTitle
) {
  const item = Array.isArray(value)
    ? value[0]
    : value;

  return item?.title || "No meeting";
}

function getDueDate(task: TaskRecord) {
  return task.due_at || task.due_date || null;
}

function formatDate(
  dateValue: string | null
) {
  if (!dateValue) {
    return "No due date";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function isDone(task: TaskRecord) {
  return task.status === "done";
}

function isOverdue(
  task: TaskRecord,
  now: Date
) {
  const dueDate = getDueDate(task);

  if (!dueDate || isDone(task)) {
    return false;
  }

  const due = new Date(dueDate);

  return (
    !Number.isNaN(due.getTime()) &&
    due < now
  );
}

function isDueToday(
  task: TaskRecord,
  todayStart: Date,
  todayEnd: Date
) {
  const dueDate = getDueDate(task);

  if (!dueDate || isDone(task)) {
    return false;
  }

  const due = new Date(dueDate);

  return (
    !Number.isNaN(due.getTime()) &&
    due >= todayStart &&
    due <= todayEnd
  );
}

function priorityTone(
  priority?: string | null
): "red" | "gold" | "green" | "gray" {
  switch (
    String(priority || "").toLowerCase()
  ) {
    case "high":
    case "urgent":
      return "red";
    case "medium":
      return "gold";
    case "low":
      return "green";
    default:
      return "gray";
  }
}

function priorityLabel(
  priority?: string | null
) {
  const value = String(
    priority || "normal"
  ).toLowerCase();

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

async function markTaskDone(
  formData: FormData
) {
  "use server";

  const taskId = String(
    formData.get("taskId") || ""
  );

  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !taskId) {
    return;
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status: "done" })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
}

async function reopenTask(
  formData: FormData
) {
  "use server";

  const taskId = String(
    formData.get("taskId") || ""
  );

  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !taskId) {
    return;
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status: "open" })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
}

async function loadTasks(
  supabase: any,
  userId: string
): Promise<TaskRecord[]> {
  const modern = await supabase
    .from("tasks")
    .select(
      "id,title,status,due_date,due_at,priority,source,notes,client_id,created_at,clients(id,name),meetings(title)"
    )
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false
    });

  if (!modern.error) {
    return (
      modern.data || []
    ) as unknown as TaskRecord[];
  }

  const dueAtFallback = await supabase
    .from("tasks")
    .select(
      "id,title,status,due_at,priority,source,notes,client_id,created_at,clients(id,name),meetings(title)"
    )
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false
    });

  if (!dueAtFallback.error) {
    return (
      dueAtFallback.data || []
    ) as unknown as TaskRecord[];
  }

  const legacy = await supabase
    .from("tasks")
    .select(
      "id,title,status,due_date,created_at,clients(name),meetings(title)"
    )
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false
    });

  return (
    legacy.data || []
  ) as unknown as TaskRecord[];
}

export default async function TasksPage() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const tasks = user
    ? await loadTasks(
        supabase,
        user.id
      )
    : [];

  const now = new Date();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const openTasks = tasks.filter(
    (task) => !isDone(task)
  );

  const doneTasks = tasks.filter(isDone);

  const overdueTasks =
    openTasks.filter((task) =>
      isOverdue(task, now)
    );

  const todayTasks = openTasks.filter(
    (task) =>
      isDueToday(
        task,
        todayStart,
        todayEnd
      )
  );

  const highPriorityTasks =
    openTasks.filter((task) =>
      ["high", "urgent"].includes(
        String(
          task.priority || ""
        ).toLowerCase()
      )
    );

  const aiTasks = openTasks.filter(
    (task) =>
      task.source === "meeting" ||
      task.notes
        ?.toLowerCase()
        .includes("ai-created") ||
      task.notes
        ?.toLowerCase()
        .includes("auto-created")
  );

  const completionRate =
    tasks.length > 0
      ? Math.round(
          (doneTasks.length /
            tasks.length) *
            100
        )
      : 0;

  const sortedOpenTasks = [
    ...openTasks
  ].sort((a, b) => {
    const aOverdue = isOverdue(a, now)
      ? 0
      : 1;

    const bOverdue = isOverdue(b, now)
      ? 0
      : 1;

    if (aOverdue !== bOverdue) {
      return aOverdue - bOverdue;
    }

    const priorityOrder: Record<
      string,
      number
    > = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3
    };

    const aPriority =
      priorityOrder[
        String(
          a.priority || ""
        ).toLowerCase()
      ] ?? 4;

    const bPriority =
      priorityOrder[
        String(
          b.priority || ""
        ).toLowerCase()
      ] ?? 4;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    const aDue = getDueDate(a)
      ? new Date(
          getDueDate(a) as string
        ).getTime()
      : Number.MAX_SAFE_INTEGER;

    const bDue = getDueDate(b)
      ? new Date(
          getDueDate(b) as string
        ).getTime()
      : Number.MAX_SAFE_INTEGER;

    return aDue - bDue;
  });

  const focusTask =
    overdueTasks[0] ||
    highPriorityTasks[0] ||
    todayTasks[0] ||
    sortedOpenTasks[0] ||
    null;

  return (
    <DashboardShell>
      <div className="cp-page">
        <section className="cp-tasks-hero">
          <div>
            <span className="cp-eyebrow">
              AI Task Command Center
            </span>

            <h1>Tasks</h1>

            <p>
              See what needs attention now, complete
              client actions quickly, and keep every
              deal moving.
            </p>

            <div className="cp-tasks-hero-actions">
              <Link
                className="cp-premium-button cp-button-gold"
                href="/dashboard/upload"
              >
                Create from Meeting
              </Link>

              <Link
                className="cp-premium-button cp-button-soft"
                href="/dashboard/reminders"
              >
                Open Reminders
              </Link>
            </div>
          </div>

          <div className="cp-task-summary-grid">
            <div>
              <span>Open</span>
              <strong>
                {openTasks.length}
              </strong>
            </div>

            <div>
              <span>Due Today</span>
              <strong>
                {todayTasks.length}
              </strong>
            </div>

            <div>
              <span>Overdue</span>
              <strong>
                {overdueTasks.length}
              </strong>
            </div>

            <div>
              <span>Completed</span>
              <strong>
                {doneTasks.length}
              </strong>
            </div>
          </div>
        </section>

        {!user ? (
          <PremiumEmptyState
            icon="🔐"
            title="Please sign in first"
            description="Login to manage your ClientPilot tasks."
            action={
              <Link
                className="cp-premium-button cp-button-gold"
                href="/login"
              >
                Open Login
              </Link>
            }
          />
        ) : tasks.length === 0 ? (
          <PremiumEmptyState
            icon="✓"
            title="No tasks yet"
            description="Upload or paste a meeting. ClientPilot AI will create clear follow-up tasks automatically."
            action={
              <Link
                className="cp-premium-button cp-button-gold"
                href="/dashboard/upload"
              >
                Process First Meeting
              </Link>
            }
          />
        ) : (
          <>
            <div className="cp-task-command-grid">
              <section className="cp-task-focus-card">
                <div className="cp-task-focus-icon">
                  ✦
                </div>

                <div>
                  <span className="cp-eyebrow">
                    AI Priority
                  </span>

                  <h2>
                    {focusTask
                      ? focusTask.title
                      : "Your task queue is clear"}
                  </h2>

                  <p>
                    {focusTask
                      ? isOverdue(
                          focusTask,
                          now
                        )
                        ? "This task is overdue. Complete it before starting lower-priority work."
                        : "This is the most useful next action based on due date and priority."
                      : "There are no open tasks requiring attention."}
                  </p>

                  {focusTask ? (
                    <div className="cp-task-focus-meta">
                      <StatusBadge
                        tone={priorityTone(
                          focusTask.priority
                        )}
                      >
                        {priorityLabel(
                          focusTask.priority
                        )}{" "}
                        Priority
                      </StatusBadge>

                      <span>
                        Due{" "}
                        {formatDate(
                          getDueDate(
                            focusTask
                          )
                        )}
                      </span>

                      <span>
                        {
                          getClient(
                            focusTask.clients
                          ).name
                        }
                      </span>
                    </div>
                  ) : null}
                </div>

                {focusTask ? (
                  <form
                    action={markTaskDone}
                  >
                    <input
                      type="hidden"
                      name="taskId"
                      value={focusTask.id}
                    />

                    <button
                      className="cp-premium-button cp-button-dark"
                      type="submit"
                    >
                      Mark Done
                    </button>
                  </form>
                ) : null}
              </section>

              <section className="cp-task-progress-card">
                <span className="cp-eyebrow">
                  Productivity
                </span>

                <h2>
                  Today&apos;s progress
                </h2>

                <ProgressMeter
                  value={completionRate}
                  label="Overall completion"
                  helper={`${doneTasks.length} of ${tasks.length} tasks completed`}
                />

                <div className="cp-task-mini-stats">
                  <div>
                    <span>High priority</span>
                    <strong>
                      {highPriorityTasks.length}
                    </strong>
                  </div>

                  <div>
                    <span>AI generated</span>
                    <strong>
                      {aiTasks.length}
                    </strong>
                  </div>
                </div>
              </section>
            </div>

            <section className="cp-task-section">
              <div className="cp-task-section-head">
                <div>
                  <span className="cp-eyebrow">
                    Active Work
                  </span>

                  <h2>
                    Open tasks
                  </h2>

                  <p>
                    Sorted by overdue status,
                    priority, and due date.
                  </p>
                </div>

                <StatusBadge tone="gold">
                  {openTasks.length} Open
                </StatusBadge>
              </div>

              {sortedOpenTasks.length ===
              0 ? (
                <PremiumEmptyState
                  icon="🎉"
                  title="All tasks completed"
                  description="Your active task queue is clear."
                />
              ) : (
                <div className="cp-task-list">
                  {sortedOpenTasks.map(
                    (task) => {
                      const client =
                        getClient(
                          task.clients
                        );

                      const overdue =
                        isOverdue(
                          task,
                          now
                        );

                      const dueToday =
                        isDueToday(
                          task,
                          todayStart,
                          todayEnd
                        );

                      const generatedByAi =
                        task.source ===
                          "meeting" ||
                        task.notes
                          ?.toLowerCase()
                          .includes(
                            "ai-created"
                          ) ||
                        task.notes
                          ?.toLowerCase()
                          .includes(
                            "auto-created"
                          );

                      return (
                        <article
                          className={`cp-task-card ${
                            overdue
                              ? "cp-task-card-overdue"
                              : ""
                          }`}
                          key={task.id}
                        >
                          <div className="cp-task-state-icon">
                            {overdue
                              ? "!"
                              : dueToday
                                ? "●"
                                : "✓"}
                          </div>

                          <div className="cp-task-card-main">
                            <div className="cp-task-card-badges">
                              <StatusBadge
                                tone={priorityTone(
                                  task.priority
                                )}
                              >
                                {priorityLabel(
                                  task.priority
                                )}
                              </StatusBadge>

                              {overdue ? (
                                <StatusBadge tone="red">
                                  Overdue
                                </StatusBadge>
                              ) : dueToday ? (
                                <StatusBadge tone="gold">
                                  Due Today
                                </StatusBadge>
                              ) : null}

                              {generatedByAi ? (
                                <StatusBadge tone="blue">
                                  AI Generated
                                </StatusBadge>
                              ) : null}
                            </div>

                            <h3>
                              {task.title}
                            </h3>

                            <div className="cp-task-details">
                              <span>
                                👤{" "}
                                {client.name}
                              </span>

                              <span>
                                🎙{" "}
                                {getMeetingTitle(
                                  task.meetings
                                )}
                              </span>

                              <span>
                                📅{" "}
                                {formatDate(
                                  getDueDate(
                                    task
                                  )
                                )}
                              </span>
                            </div>

                            {task.notes ? (
                              <p>
                                {task.notes}
                              </p>
                            ) : null}
                          </div>

                          <div className="cp-task-card-actions">
                            {client.id ? (
                              <Link
                                className="cp-premium-button cp-button-soft"
                                href={`/dashboard/clients/${client.id}`}
                              >
                                Open Client
                              </Link>
                            ) : null}

                            <form
                              action={
                                markTaskDone
                              }
                            >
                              <input
                                type="hidden"
                                name="taskId"
                                value={task.id}
                              />

                              <button
                                className="cp-premium-button cp-button-gold"
                                type="submit"
                              >
                                Mark Done
                              </button>
                            </form>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            {doneTasks.length > 0 ? (
              <section className="cp-task-section cp-completed-task-section">
                <div className="cp-task-section-head">
                  <div>
                    <span className="cp-eyebrow">
                      Completed
                    </span>

                    <h2>
                      Finished tasks
                    </h2>

                    <p>
                      Reopen a task when more work is
                      required.
                    </p>
                  </div>

                  <StatusBadge tone="green">
                    {doneTasks.length} Done
                  </StatusBadge>
                </div>

                <div className="cp-completed-task-list">
                  {doneTasks.map(
                    (task) => (
                      <article key={task.id}>
                        <div className="cp-completed-check">
                          ✓
                        </div>

                        <div>
                          <strong>
                            {task.title}
                          </strong>

                          <span>
                            {
                              getClient(
                                task.clients
                              ).name
                            }{" "}
                            ·{" "}
                            {getMeetingTitle(
                              task.meetings
                            )}
                          </span>
                        </div>

                        <form
                          action={reopenTask}
                        >
                          <input
                            type="hidden"
                            name="taskId"
                            value={task.id}
                          />

                          <button
                            className="cp-premium-button cp-button-soft"
                            type="submit"
                          >
                            Reopen
                          </button>
                        </form>
                      </article>
                    )
                  )}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
