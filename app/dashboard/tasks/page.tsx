import { DashboardShell } from "@/components/DashboardShell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

type RelationName = { name?: string } | { name?: string }[] | null;
type RelationTitle = { title?: string } | { title?: string }[] | null;

type TaskRecord = {
  id: string;
  title: string;
  status: string | null;
  due_date: string | null;
  created_at: string;
  clients: RelationName;
  meetings: RelationTitle;
};

function getName(value: RelationName) {
  if (Array.isArray(value)) return value[0]?.name || "No client";
  return value?.name || "No client";
}

function getTitle(value: RelationTitle) {
  if (Array.isArray(value)) return value[0]?.title || "No meeting";
  return value?.title || "No meeting";
}

function formatDate(date: string | null) {
  if (!date) return "No due date";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(date));
}

async function markTaskDone(formData: FormData) {
  "use server";

  const taskId = String(formData.get("taskId") || "");
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !taskId) return;

  await supabase
    .from("tasks")
    .update({ status: "done" })
    .eq("id", taskId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
}

async function reopenTask(formData: FormData) {
  "use server";

  const taskId = String(formData.get("taskId") || "");
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user || !taskId) return;

  await supabase
    .from("tasks")
    .update({ status: "open" })
    .eq("id", taskId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tasks");
}

export default async function TasksPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data } = user
    ? await supabase
        .from("tasks")
        .select("id,title,status,due_date,created_at,clients(name),meetings(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const tasks = (data || []) as unknown as TaskRecord[];
  const openTasks = tasks.filter((task) => task.status !== "done");
  const doneTasks = tasks.filter((task) => task.status === "done");

  return (
    <DashboardShell>
      <div className="page-hero">
        <div>
          <span className="badge">Follow-Up System</span>
          <h1 style={{ fontSize: 46 }}>Tasks</h1>
          <p className="muted">
            Manage the action items created from every client meeting.
          </p>
        </div>
        <div className="hero-mini-card">
          <strong>{openTasks.length}</strong>
          <span>Open tasks</span>
        </div>
      </div>

      {!user ? (
        <div className="card">
          <p>Please login first from /login.</p>
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <div className="empty-state">
          <h3>No tasks yet</h3>
          <p className="muted">
            Upload a meeting first. ClientPilot AI will create follow-up tasks automatically.
          </p>
        </div>
      ) : null}

      {openTasks.length > 0 ? (
        <section className="task-board-section">
          <h2>Open Tasks</h2>
          <div className="task-board">
            {openTasks.map((task) => (
              <div className="task-card-pro" key={task.id}>
                <div>
                  <span className="pill">Open</span>
                  <h3>{task.title}</h3>
                  <p className="muted">
                    Client: {getName(task.clients)}
                    <br />
                    Meeting: {getTitle(task.meetings)}
                    <br />
                    Due: {formatDate(task.due_date)}
                  </p>
                </div>

                <form action={markTaskDone}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button className="btn gold" type="submit">
                    Mark Done
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {doneTasks.length > 0 ? (
        <section className="task-board-section">
          <h2>Done Tasks</h2>
          <div className="task-board">
            {doneTasks.map((task) => (
              <div className="task-card-pro done" key={task.id}>
                <div>
                  <span className="pill soft">Done</span>
                  <h3>{task.title}</h3>
                  <p className="muted">
                    Client: {getName(task.clients)}
                    <br />
                    Meeting: {getTitle(task.meetings)}
                  </p>
                </div>

                <form action={reopenTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <button className="btn secondary" type="submit">
                    Reopen
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
