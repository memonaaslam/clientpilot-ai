import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function DashboardShell({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="side-title">
          ClientPilot<span style={{ color: "var(--gold)" }}>AI</span>
        </Link>

        <nav className="side-nav" style={{ marginTop: 24 }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/clients">Clients</Link>
          <Link href="/dashboard/pipeline">Pipeline</Link>
          <Link href="/dashboard/upload">Upload Meeting</Link>
          <Link href="/dashboard/meetings">Meetings</Link>
          <Link href="/dashboard/tasks">Tasks</Link>
          <Link href="/dashboard/reminders">Reminders</Link>
          <Link href="/dashboard/proposals">Proposals</Link>
          <Link href="/dashboard/settings">Settings</Link>
          <Link href="/dashboard/subscription">Subscription</Link>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-legal-links">
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/refund-policy">Refunds</Link>
            <Link href="/contact">Contact</Link>
          </div>

          {user ? (
            <LogoutButton />
          ) : (
            <Link href="/login" className="logout-btn">
              Sign In
            </Link>
          )}
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
