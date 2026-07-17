"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryNavItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "D"
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: "AN"
  },
  {
    href: "/dashboard/clients",
    label: "Clients",
    icon: "C"
  },
  {
    href: "/dashboard/client-timeline",
    label: "Client Timeline",
    icon: "CT"
  },
  {
    href: "/dashboard/pipeline",
    label: "Pipeline",
    icon: "P"
  },
  {
    href: "/dashboard/upload",
    label: "Upload Meeting",
    icon: "U"
  },
  {
    href: "/dashboard/meetings",
    label: "Meetings",
    icon: "M"
  },
  {
    href: "/dashboard/tasks",
    label: "Tasks",
    icon: "T"
  },
  {
    href: "/dashboard/reminders",
    label: "Reminders",
    icon: "R"
  },
  {
    href: "/dashboard/follow-ups",
    label: "Follow-ups",
    icon: "F"
  },
  {
    href: "/dashboard/sales-team",
    label: "Sales Team",
    icon: "A"
  },
  {
    href: "/dashboard/sales-activity",
    label: "Sales Activity",
    icon: "SA"
  },
  {
    href: "/sales/login",
    label: "Sales Login",
    icon: "SL"
  },
  {
    href: "/dashboard/proposals",
    label: "Proposals",
    icon: "P"
  },
  {
    href: "/dashboard/proposal-pdf",
    label: "Proposal PDF",
    icon: "PDF"
  },
  {
    href: "/dashboard/recycle-bin",
    label: "Recycle Bin",
    icon: "B"
  },
  {
    href: "/dashboard/support",
    label: "Support",
    icon: "?"
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: "S"
  },
  {
    href: "/dashboard/subscription",
    label: "Subscription",
    icon: "$"
  }
];

export function DashboardSidebar({
  userEmail,
  isOwner = false,
  mobileOpen = false,
  onClose,
  onNavigate
}: {
  userEmail?: string | null;
  isSignedIn?: boolean;
  isOwner?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const navItems = isOwner
    ? [
        primaryNavItems[0],
        
        
        ...primaryNavItems.slice(1)
      ]
    : primaryNavItems;

  return (
    <aside
      id="clientpilot-dashboard-sidebar"
      className={`dashboard-sidebar ${
        mobileOpen ? "mobile-open" : ""
      }`}
      aria-label="ClientPilot dashboard navigation"
    >
      <button
        type="button"
        className="cp-mobile-sidebar-close"
        onClick={onClose}
        aria-label="Close dashboard navigation"
      >
        ?
      </button>

      <div className="sidebar-top">
        <Link
          href="/dashboard"
          className="sidebar-brand sidebar-brand-logo-only"
          onClick={onNavigate}
          aria-label="ClientPilot AI Dashboard"
        >
          <div className="sidebar-clientpilot-brand">
            <span className="sidebar-clientpilot-mark">CP</span>
            <span className="sidebar-clientpilot-name">ClientPilot AI</span>
          </div>
        </Link>

        <div className="sidebar-workspace-card">
          <span className="workspace-avatar">
            {isOwner ? "O" : "M"}
          </span>

          <div>
            <strong>
              {isOwner
                ? "Makzora Owner"
                : "Workspace"}
            </strong>

            <small>
              {userEmail ||
                "ClientPilot Workspace"}
            </small>
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
              onClick={onNavigate}
              className={`sidebar-nav-item ${
                isActive ? "active" : ""
              } ${
                item.href.startsWith(
                  "/dashboard/owner"
                )
                  ? "sidebar-owner-item"
                  : ""
              }`}
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
          <strong>ClientPilot AI</strong>

          <small className="sidebar-product-line">
            Smart CRM ? Follow-up Automation ?
            Proposal Workflow
          </small>

          <div className="sidebar-dev-line" />

          <span>Software Developed by</span>

          <img
            src="/clientpilotai/makzora-logo-official.png?v=official"
            alt="Makzora"
          />

          <div className="sidebar-legal-links">
            <Link
              href="/privacy-policy"
              onClick={onNavigate}
            >
              Privacy
            </Link>

            <Link
              href="/terms"
              onClick={onNavigate}
            >
              Terms
            </Link>

            <Link
              href="/refund-policy"
              onClick={onNavigate}
            >
              Refunds
            </Link>

            <Link
              href="/contact"
              onClick={onNavigate}
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
