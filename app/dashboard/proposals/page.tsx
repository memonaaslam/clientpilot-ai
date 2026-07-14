import Link from "next/link";

import { DashboardShell } from "@/components/DashboardShell";
import { PremiumEmptyState } from "@/components/PremiumUI";
import { ProposalManager } from "@/components/ProposalManager";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type ClientOption = {
  id: string;
  name: string;
};

export default async function ProposalsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardShell>
        <PremiumEmptyState
          icon="🔐"
          title="Please sign in first"
          description="Login to create and manage proposals."
          action={
            <Link className="cp-premium-button cp-button-gold" href="/login">
              Open Login
            </Link>
          }
        />
      </DashboardShell>
    );
  }

  const { data } = await supabase
    .from("clients")
    .select("id,name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const clients: ClientOption[] = (data || []).map((client: any) => ({
    id: String(client.id),
    name: String(client.name)
  }));

  return (
    <DashboardShell>
      <div className="cp-page">
        <section className="cp-proposals-page-hero">
          <div>
            <span className="cp-eyebrow">Proposal Command Center</span>
            <h1>Proposals</h1>
            <p>
              Create, review, approve, export, share, and manage professional
              client proposals from one premium workspace.
            </p>
          </div>

          <div className="cp-proposals-page-mark">
            <strong>AI</strong>
            <span>Proposal ready</span>
          </div>
        </section>

        <ProposalManager clients={clients} />
      </div>
    </DashboardShell>
  );
}
