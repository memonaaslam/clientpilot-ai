"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "D" },
  { href: "/dashboard/clients", label: "Clients", icon: "C" },
  { href: "/dashboard/client-timeline", label: "Client Timeline", icon: "CT" },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: "P" },
  { href: "/dashboard/upload", label: "Upload Meeting", icon: "U" },
  { href: "/dashboard/meetings", label: "Meetings", icon: "M" },
  { href: "/dashboard/tasks", label: "Tasks", icon: "T" },
  { href: "/dashboard/reminders", label: "Reminders", icon: "R" },
  { href: "/dashboard/follow-ups", label: "Follow-ups", icon: "F" },
  { href: "/dashboard/sales-team", label: "Sales Team", icon: "A" },
  { href: "/dashboard/sales-activity", label: "Sales Activity", icon: "SA" },
  { href: "/sales/login", label: "Sales Login", icon: "SL" },
  { href: "/dashboard/proposals", label: "Proposals", icon: "P" },
  { href: "/dashboard/proposal-pdf", label: "Proposal PDF", icon: "PDF" },
  { href: "/dashboard/recycle-bin", label: "Recycle Bin", icon: "B" },
  { href: "/dashboard/settings", label: "Settings", icon: "S" },
  { href: "/dashboard/subscription", label: "Subscription", icon: "$" }
];

export function DashboardSidebar({ userEmail }: { userEmail?: string | null; isSignedIn?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-top">
        <Link href="/dashboard" className="sidebar-brand">
          <span className="sidebar-brand-mark">CP</span>
          <span>
            <strong>ClientPilot</strong>
            <small>AI Workspace</small>
          </span>
        </Link>

        <div className="sidebar-workspace-card">
          <span className="workspace-avatar">M</span>
          <div>
            <strong>Workspace</strong>
            <small>{userEmail || "memonaaslam00@gmail.com"}</small>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname?.startsWith(item.href);

          return (
            <Link
              href={item.href}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              key={item.href}
            >
              <span>{item.icon}</span>
              <strong>{item.label}</strong>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-dev-card">
          <small>Software Developed by</small>
          <img src="/makzora-logo-official.png" alt="Makzora" />
          <div className="sidebar-legal-links">
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/refund-policy">Refunds</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </div>
    </aside>
  );
}


