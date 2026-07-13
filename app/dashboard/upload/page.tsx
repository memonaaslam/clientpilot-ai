import { DashboardShell } from "@/components/DashboardShell";
import { RecorderUploader } from "@/components/RecorderUploader";import { createSupabaseServerClient } from "@/lib/supabase-server";

type ClientOption = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

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

  let clientRows: ClientOption[] = [];

  const fullClients = await supabase
    .from("clients")
    .select("id,name,phone,email")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (fullClients.data) {
    clientRows = fullClients.data as ClientOption[];
  } else {
    const fallback = await supabase
      .from("clients")
      .select("id,name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    clientRows = (fallback.data || []).map((client: any) => ({
      id: String(client.id),
      name: String(client.name),
      phone: null,
      email: null
    }));
  }

  return (
    <DashboardShell>
      <div className="page-hero">
        <div>
          <span className="badge">Smart Meeting Workflow</span>
          <h1 style={{ fontSize: 46 }}>Upload Meeting</h1>
          <p className="muted">
            Upload or record a meeting. ClientPilot AI will transcribe it, generate a summary, create tasks, reminders, proposal points, and update the client timeline automatically.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>Smart</strong>
          <span>Follow-up</span>
        </div>
      </div>

      <RecorderUploader clients={clientRows} />
    </DashboardShell>
  );
}