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

function getOwnerEmails() {
  return String(
    process.env.OWNER_EMAILS ||
      process.env.OWNER_EMAIL ||
      ""
  )
    .split(",")
    .map((email) =>
      email.trim().toLowerCase()
    )
    .filter(Boolean);
}

export async function DashboardShell({
  children
}: DashboardShellProps) {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const userEmail = String(
    user?.email || ""
  )
    .trim()
    .toLowerCase();

  const isOwner =
    Boolean(userEmail) &&
    getOwnerEmails().includes(userEmail);

  return (
    <DashboardMobileShell
      userEmail={user?.email || null}
      isSignedIn={Boolean(user)}
      isOwner={isOwner}
    >
      {children}
    </DashboardMobileShell>
  );
}
