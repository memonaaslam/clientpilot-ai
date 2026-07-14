import Link from "next/link";

import {
  ClientSupportCenter
} from "@/components/ClientSupportCenter";

import {
  DashboardShell
} from "@/components/DashboardShell";

import {
  PremiumEmptyState
} from "@/components/PremiumUI";

import {
  createSupabaseServerClient
} from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardShell>
        <PremiumEmptyState
          icon="?"
          title="Please sign in first"
          description="Login to submit and track your ClientPilot AI support issues."
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

  return (
    <DashboardShell>
      <ClientSupportCenter
        initialEmail={user.email || ""}
      />
    </DashboardShell>
  );
}
