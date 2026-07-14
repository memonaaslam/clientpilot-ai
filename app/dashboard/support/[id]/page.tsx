import Link from "next/link";

import {
  ClientSupportTicket
} from "@/components/ClientSupportTicket";

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

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClientSupportTicketPage({
  params
}: PageProps) {
  const {
    id
  } = await params;

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
          description="Login to view this ClientPilot AI support ticket."
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
      <ClientSupportTicket
        ticketId={id}
        accountEmail={user.email || ""}
      />
    </DashboardShell>
  );
}
