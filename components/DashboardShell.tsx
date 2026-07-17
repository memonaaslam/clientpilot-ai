import { ReactNode } from "react";

import {
  DashboardMobileShell
} from "@/components/DashboardMobileShell";

import {
  createSupabaseServerClient
} from "@/lib/supabase-server";

type DashboardShellProps = {
  children: ReactNode;
};

export async function DashboardShell({
  children
}: DashboardShellProps) {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <DashboardMobileShell
      userEmail={user?.email || null}
      isSignedIn={Boolean(user)}
      isOwner={false}
    >
      {children}
    </DashboardMobileShell>
  );
}