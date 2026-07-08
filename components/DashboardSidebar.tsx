"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

type DashboardSidebarProps = {
  userEmail: string | null;
  isSignedIn: boolean;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "Ã¢Å’â€š" },
  { href: "/dashboard/clients", label: "Clients", icon: "Ã¢â€”â€°" },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: "Ã¢â€”â€ " },
  { href: "/dashboard/upload", label: "Upload Meeting", icon: "Ã¢â€”Å½" },
  { href: "/dashboard/meetings", label: "Meetings", icon: "Ã¢â€”Å’" },
  { href: "/dashboard/tasks", label: "Tasks", icon: "Ã¢Å“â€œ" },
  { href: "/dashboard/reminders", label: "Reminders", icon: "Ã¢ÂÂ±" },
  { href: "/dashboard/proposals", label: "Proposals", icon: "Ã¢Å“Â¦" },
  { href: "/dashboard/settings", label: "Settings", icon: "Ã¢Å¡â„¢" },
  { href: "/dashboard/subscription", label: "Subscription", icon: "Ã¢Ëœâ€¦" }
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
    <aside className="sidebar sidebar-premium">
      <div className="sidebar-orb one" />
      <div className="sidebar-orb two" />

      <div className="sidebar-inner">
        <div className="sidebar-brand-block">
          <Link href="/dashboard" className="side-title side-title-premium">
            <span className="brand-mark">CP</span>
            <strong>
              ClientPilot<span>AI</span>
            </strong>
          </Link>

          <p>Smart CRM for meetings, proposals, tasks, and follow-ups.</p>
        </div>

        <nav className="side-nav side-nav-premium" aria-label="Dashboard navigation">
          {navItems.map((item, index) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                href={item.href}
                key={item.href}
                className={`nav-item-premium ${active ? "active" : ""}`}
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                <span className="nav-glow" />
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom-panel">
          <div className="account-mini-card">
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