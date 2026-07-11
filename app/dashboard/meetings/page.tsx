import { CopyButton } from "@/components/CopyButton";
import { DashboardShell } from "@/components/DashboardShell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type TaskRecord = {
  id: string;
  title: string;
  status: string | null;
  due_date: string | null;
};

type ClientRelation = { name?: string } | { name?: string }[] | null;

type MeetingRecord = {
  id: string;
  title: string;
  summary: string | null;
  follow_up_message: string | null;
  email_follow_up: string | null;
  transcript: string | null;
  created_at: string;
  clients: ClientRelation;
  tasks: TaskRecord[] | null;
};

function getClientName(client: ClientRelation) {
  if (Array.isArray(client)) return client[0]?.name || "Unknown client";
  return client?.name || "Unknown client";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

export default async function MeetingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data } = user
    ? await supabase
        .from("meetings")
        .select(
          "id,title,summary,follow_up_message,email_follow_up,transcript,created_at,clients(name),tasks(id,title,status,due_date)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const meetings = (data || []) as unknown as MeetingRecord[];

  return (
    <DashboardShell>
      <div className="page-hero">
        <div>
          <span className="badge">AI Meeting Memory</span>
          <h1 style={{ fontSize: 46 }}>Meetings</h1>
          <p className="muted">
            Every client conversation becomes a clean summary, WhatsApp follow-up,
            email draft, and task list.
          </p>
        </div>
        <div className="hero-mini-card">
          <strong>{meetings.length}</strong>
          <span>Saved meetings</span>
        </div>
      </div>

      {!user ? (
        <div className="card">
          <p>Please login first from /login.</p>
        </div>
      ) : null}

      {meetings.length === 0 ? (
        <div className="empty-state">
          <h3>No meetings yet</h3>
          <p className="muted">
            Upload your first client meeting and ClientPilot AI will create the
            transcript, summary, follow-up, and tasks.
          </p>
        </div>
      ) : null}

      <div className="meeting-list">
        {meetings.map((meeting) => {
          const summary = meeting.summary || "No summary yet.";
          const whatsapp = meeting.follow_up_message || "";
          const email = meeting.email_follow_up || "";
          const transcript = meeting.transcript || "";

          return (
            <article className="meeting-card" key={meeting.id}>
              <div className="meeting-top">
                <div>
                  <div className="pill-row">
                    <span className="pill">{getClientName(meeting.clients)}</span>
                    <span className="pill soft">{formatDate(meeting.created_at)}</span>
                  </div>
                  <h2>{meeting.title}</h2>
                </div>
              </div>

              <div className="meeting-section highlight">
                <div className="section-head">
                  <h3>AI Summary</h3>
                  <CopyButton text={summary} label="Copy summary" />
                </div>
                <p>{summary}</p>
              </div>

              {whatsapp ? (
                <div className="meeting-section">
                  <div className="section-head">
                    <h3>WhatsApp Follow-Up</h3>
                    <CopyButton text={whatsapp} label="Copy WhatsApp" />
                  </div>
                  <p className="message-box">{whatsapp}</p>
                </div>
              ) : null}

              {email ? (
                <div className="meeting-section">
                  <div className="section-head">
                    <h3>Email Follow-Up</h3>
                    <CopyButton text={email} label="Copy email" />
                  </div>
                  <pre className="email-box">{email}</pre>
                </div>
              ) : null}

              {meeting.tasks && meeting.tasks.length > 0 ? (
                <div className="meeting-section">
                  <h3>Tasks Created</h3>
                  <div className="task-list">
                    {meeting.tasks.map((task) => (
                      <div className="task-item" key={task.id}>
                        <span>{task.title}</span>
                        <small>{task.status || "open"}</small>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {transcript ? (
                <details className="transcript-box">
                  <summary>View transcript</summary>
                  <div className="section-head" style={{ marginTop: 14 }}>
                    <h3>Transcript</h3>
                    <CopyButton text={transcript} label="Copy transcript" />
                  </div>
                  <p>{transcript}</p>
                </details>
              ) : null}
            </article>
          );
        })}
      </div>
    </DashboardShell>
  );
}
