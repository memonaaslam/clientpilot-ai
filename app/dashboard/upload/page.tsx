import { DashboardShell } from "@/components/DashboardShell";
import { RecorderUploader } from "@/components/RecorderUploader";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function UploadMeetingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: clients } = user
    ? await supabase.from("clients").select("id,name").eq("user_id", user.id).order("created_at", { ascending: false })
    : { data: [] };

  return (
    <DashboardShell>
      <h1 style={{ fontSize: 46 }}>Upload Meeting</h1>
      <p className="muted">Record audio or upload a meeting file. AI will create transcript, summary, follow-up, and tasks.</p>
      {!user ? <div className="card"><p>Please login first from /login.</p></div> : null}
      {clients && clients.length > 0 ? (
        <RecorderUploader clients={clients} />
      ) : (
        <div className="card"><p>Add a client first before uploading a meeting.</p></div>
      )}
    </DashboardShell>
  );
}
