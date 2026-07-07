import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="side-title">
          ClientPilot<span style={{ color: "var(--gold)" }}>AI</span>
        </Link>

        <nav className="side-nav" style={{ marginTop: 24 }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/clients">Clients</Link>
          <Link href="/dashboard/pipeline">Pipeline</Link>
          <Link href="/dashboard/upload">Upload Meeting</Link>
          <Link href="/dashboard/meetings">Meetings</Link>
          <Link href="/dashboard/tasks">Tasks</Link>
          <Link href="/dashboard/proposals">Proposals</Link>
          <Link href="/dashboard/settings">Settings</Link>
          <Link href="/dashboard/subscription">Subscription</Link>
        </nav>

        <div className="sidebar-bottom">
          <LogoutButton />
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}