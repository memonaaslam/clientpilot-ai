import { ReactNode } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type DashboardShellProps = {
  children: ReactNode;
};

export async function DashboardShell({ children }: DashboardShellProps) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="shell shell-premium">
      <DashboardSidebar userEmail={user?.email || null} isSignedIn={Boolean(user)} />

      <main className="main main-premium">{children}</main>
    </div>
  );
}