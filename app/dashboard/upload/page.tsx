import { DashboardShell } from "@/components/DashboardShell";
import { SmartMeetingUpload } from "@/components/SmartMeetingUpload";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function UploadPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardShell>
        <div className="empty-state">
          <h2>Please sign in first</h2>
          <p className="muted">Login to process meeting notes and create follow-ups.</p>
        </div>
      </DashboardShell>
    );
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("id,name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardShell>
      <div className="page-hero">
        <div>
          <span className="badge">Smart Meeting Workflow</span>
          <h1 style={{ fontSize: 46 }}>Upload Meeting</h1>
          <p className="muted">
            Paste meeting notes and create a smart summary, follow-up tasks, and proposal points.
            No paid AI API is required in Free Smart Mode.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>Free</strong>
          <span>Smart Mode</span>
        </div>
      </div>

      <SmartMeetingUpload clients={clients || []} />
    </DashboardShell>
  );
}