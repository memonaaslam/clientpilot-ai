import Link from "next/link";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="side-title">ClientPilot<span style={{ color: "var(--gold)" }}>AI</span></Link>
        <nav className="side-nav" style={{ marginTop: 24 }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/clients">Clients</Link>
          <Link href="/dashboard/pipeline">Pipeline</Link>
          <Link href="/dashboard/upload">Upload Meeting</Link>
          <Link href="/dashboard/meetings">Meetings</Link>
          <Link href="/dashboard/tasks">Tasks</Link>
          <Link href="/dashboard/proposals">Proposals</Link>
          <Link href="/dashboard/settings">Settings</Link>
          <Link href="/#pricing">Subscription</Link>
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}