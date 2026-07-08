"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

type DashboardSidebarProps = {
  userEmail: string | null;
  isSignedIn: boolean;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "D" },
  { href: "/dashboard/clients", label: "Clients", icon: "C" },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: "P" },
  { href: "/dashboard/upload", label: "Upload Meeting", icon: "U" },
  { href: "/dashboard/meetings", label: "Meetings", icon: "M" },
  { href: "/dashboard/tasks", label: "Tasks", icon: "T" },
  { href: "/dashboard/reminders", label: "Reminders", icon: "R" },
  { href: "/dashboard/sales-team", label: "Sales Team", icon: "A" },
  { href: "/dashboard/proposals", label: "Proposals", icon: "P" },
  { href: "/dashboard/recycle-bin", label: "Recycle Bin", icon: "B" },
  { href: "/dashboard/settings", label: "Settings", icon: "S" },
  { href: "/dashboard/subscription", label: "Subscription", icon: "$" }
];

const legalLinks = [
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund-policy", label: "Refunds" },
  { href: "/contact", label: "Contact" }
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({ userEmail, isSignedIn }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sidebar sidebar-premium sidebar-business">
      <div className="sidebar-inner">
        <div className="sidebar-brand-block sidebar-brand-business">
          <Link href="/dashboard" className="side-title-business">
            <span className="brand-emblem">
              <span>CP</span>
            </span>

            <span className="brand-word">
              <strong>ClientPilot</strong>
              <small>AI Workspace</small>
            </span>
          </Link>
        </div>

        <div className="sidebar-command-card">
          <span>Today</span>
          <strong>Follow-up command center</strong>
          <p>Open reminders, tasks, and proposals before leads go cold.</p>
        </div>

        <nav className="side-nav-business" aria-label="Dashboard navigation">
          {navItems.map((item, index) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                href={item.href}
                key={item.href}
                className={`business-nav-item ${active ? "active" : ""}`}
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <span className="business-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom-business">
          <div className="account-mini-card business-account">
            <span className="account-avatar">
              {userEmail ? userEmail.slice(0, 1).toUpperCase() : "G"}
            </span>

            <div>
              <strong>{isSignedIn ? "Workspace" : "Guest"}</strong>
              <p>{userEmail || "Sign in to continue"}</p>
            </div>
          </div>

          {isSignedIn ? (
            <LogoutButton />
          ) : (
            <Link href="/login" className="sidebar-login-btn">
              Sign In
            </Link>
          )}

          <div className="sidebar-legal-links sidebar-legal-premium">
            {legalLinks.map((link) => (
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}