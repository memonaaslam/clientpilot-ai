import Link from "next/link";

import { DashboardShell } from "@/components/DashboardShell";
import { PremiumEmptyState } from "@/components/PremiumUI";
import { ReminderCenter } from "@/components/ReminderCenter";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type ClientOption = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

export default async function RemindersPage() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardShell>
        <PremiumEmptyState
          icon="🔐"
          title="Please sign in first"
          description="Login to manage your follow-up reminders."
          action={
            <Link
              className="cp-premium-button cp-button-gold"
              href="/login"
            >
              Open Login
            </Link>
          }
        />
      </DashboardShell>
    );
  }

  let clientRows: ClientOption[] = [];

  const fullClients = await supabase
    .from("clients")
    .select("id,name,phone,email")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false
    });

  if (fullClients.data) {
    clientRows =
      fullClients.data as ClientOption[];
  } else {
    const fallback = await supabase
      .from("clients")
      .select("id,name")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false
      });

    clientRows = (
      fallback.data || []
    ).map((client: any) => ({
      id: String(client.id),
      name: String(client.name),
      phone: null,
      email: null
    }));
  }

  return (
    <DashboardShell>
      <div className="cp-page">
        <section className="cp-reminders-page-hero">
          <div>
            <span className="cp-eyebrow">
              Follow-Up Autopilot
            </span>

            <h1>Reminders</h1>

            <p>
              Create follow-ups, add them to Google
              Calendar, open WhatsApp instantly,
              snooze when needed, and never lose a
              client because of missed action.
            </p>
          </div>

          <div className="cp-reminders-page-badge">
            <strong>AI</strong>
            <span>Follow-up ready</span>
          </div>
        </section>

        <ReminderCenter clients={clientRows} />
      </div>
    </DashboardShell>
  );
}
