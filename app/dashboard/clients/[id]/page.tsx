import { DashboardShell } from "@/components/DashboardShell";
import { ProposalGenerator } from "@/components/ProposalGenerator";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientMemoryPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardShell>
        <div className="card">
          <p>Please login first from /login.</p>
        </div>
      </DashboardShell>
    );
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id,name,phone,email,company,notes,stage")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: meetings } = await supabase
    .from("meetings")
    .select("id,title,summary,follow_up_message,email_follow_up,transcript,created_at")
    .eq("client_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id,title,status,created_at")
    .eq("client_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: settings } = await supabase
    .from("business_settings")
    .select("business_name,logo_text,currency,whatsapp_signature,email_signature,proposal_footer")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) {
    return (
      <DashboardShell>
        <div className="card">
          <Link href="/dashboard/clients">Back to clients</Link>
          <h1>Client Not Found</h1>
          <p className="muted">Client ID: {id}</p>
        </div>
      </DashboardShell>
    );
  }

  const openTasks = (tasks || []).filter((task) => task.status !== "done");

  return (
    <DashboardShell>
      <div className="page-hero">
        <div>
          <Link href="/dashboard/clients" className="back-link">
            Back to clients
          </Link>
          <span className="badge">Client Memory</span>
          <h1 style={{ fontSize: 46 }}>{client.name}</h1>
          <p className="muted">
            {client.company || "No company"} | {client.phone || "No phone"} |{" "}
            {client.email || "No email"}
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>{openTasks.length}</strong>
          <span>Open tasks</span>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <h3>Client Details</h3>
          <p className="muted">
            <strong>Stage:</strong> {client.stage || "new_lead"}
            <br />
            <strong>Phone:</strong> {client.phone || "Not added"}
            <br />
            <strong>Email:</strong> {client.email || "Not added"}
            <br />
            <strong>Notes:</strong> {client.notes || "No notes added"}
          </p>
        </div>

        <div className="card">
          <h3>Client Stats</h3>
          <div className="mini-stats">
            <div>
              <strong>{meetings?.length || 0}</strong>
              <span>Meetings</span>
            </div>
            <div>
              <strong>{tasks?.length || 0}</strong>
              <span>Tasks</span>
            </div>
            <div>
              <strong>{openTasks.length}</strong>
              <span>Open</span>
            </div>
          </div>
        </div>
      </div>

      <section className="task-board-section">
        <h2>Client Tasks</h2>

        {(tasks || []).length === 0 ? (
          <div className="empty-state">
            <p className="muted">No tasks for this client yet.</p>
          </div>
        ) : (
          <div className="task-board">
            {(tasks || []).map((task) => (
              <div className={"task-card-pro " + (task.status === "done" ? "done" : "")} key={task.id}>
                <div>
                  <span className={task.status === "done" ? "pill soft" : "pill"}>
                    {task.status === "done" ? "Done" : "Open"}
                  </span>
                  <h3>{task.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="task-board-section">
        <h2>Meeting Memory</h2>

        {(meetings || []).length === 0 ? (
          <div className="empty-state">
            <p className="muted">No meetings uploaded for this client yet.</p>
          </div>
        ) : (
          <div className="meeting-list">
            {(meetings || []).map((meeting) => (
              <article className="meeting-card" key={meeting.id}>
                <div className="pill-row">
                  <span className="pill soft">{meeting.title}</span>
                </div>

                <div className="meeting-section highlight">
                  <h3>AI Summary</h3>
                  <p>{meeting.summary || "No summary."}</p>
                </div>

                <ProposalGenerator
                  clientId={client.id}
                  meetingId={meeting.id}
                  clientName={client.name}
                  company={client.company}
                  phone={client.phone}
                  email={client.email}
                  meetingTitle={meeting.title}
                  summary={meeting.summary}
                  businessName={settings?.business_name}
                  logoText={settings?.logo_text}
                  currency={settings?.currency}
                  whatsappSignature={settings?.whatsapp_signature}
                  emailSignature={settings?.email_signature}
                  proposalFooter={settings?.proposal_footer}
                />

                {meeting.follow_up_message ? (
                  <div className="meeting-section">
                    <h3>WhatsApp Follow-Up</h3>
                    <p className="message-box">{meeting.follow_up_message}</p>
                  </div>
                ) : null}

                {meeting.email_follow_up ? (
                  <div className="meeting-section">
                    <h3>Email Follow-Up</h3>
                    <pre className="email-box">{meeting.email_follow_up}</pre>
                  </div>
                ) : null}

                {meeting.transcript ? (
                  <details className="transcript-box">
                    <summary>View transcript</summary>
                    <p>{meeting.transcript}</p>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}