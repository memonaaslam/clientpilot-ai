"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";

import {
  DashboardHelpButton
} from "@/components/DashboardHelpButton";

import {
  DashboardSidebar
} from "@/components/DashboardSidebar";

type DashboardMobileShellProps = {
  children: ReactNode;
  userEmail?: string | null;
  isSignedIn: boolean;
  isOwner: boolean;
};

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/analytics": "Analytics",
  "/dashboard/clients": "Clients",
  "/dashboard/client-timeline": "Client Timeline",
  "/dashboard/pipeline": "Pipeline",
  "/dashboard/upload": "Upload Meeting",
  "/dashboard/meetings": "Meetings",
  "/dashboard/tasks": "Tasks",
  "/dashboard/reminders": "Reminders",
  "/dashboard/follow-ups": "Follow-ups",
  "/dashboard/sales-team": "Sales Team",
  "/dashboard/sales-activity": "Sales Activity",
  "/dashboard/proposals": "Proposals",
  "/dashboard/proposal-pdf": "Proposal PDF",
  "/dashboard/recycle-bin": "Recycle Bin",
  "/dashboard/support": "Support",
  "/dashboard/settings": "Settings",
  "/dashboard/subscription": "Subscription",
  "/dashboard/owner/support": "Client Issues",
  "/dashboard/owner": "Owner Dashboard"
};

function getPageTitle(pathname: string) {
  const matchingRoute = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find((route) =>
      route === "/dashboard"
        ? pathname === route
        : pathname.startsWith(route)
    );

  return matchingRoute
    ? PAGE_TITLES[matchingRoute]
    : "ClientPilot AI";
}

export function DashboardMobileShell({
  children,
  userEmail,
  isSignedIn,
  isOwner
}: DashboardMobileShellProps) {
  const pathname = usePathname() || "/dashboard";

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const menuButtonRef =
    useRef<HTMLButtonElement | null>(null);

  const sidebarContainerRef =
    useRef<HTMLDivElement | null>(null);

  const pageTitle = getPageTitle(pathname);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  useEffect(() => {
    closeSidebar();
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) {
      document.body.classList.remove(
        "cp-mobile-menu-open"
      );

      return;
    }

    document.body.classList.add(
      "cp-mobile-menu-open"
    );

    const sidebar =
      sidebarContainerRef.current;

    const firstFocusable =
      sidebar?.querySelector<HTMLElement>(
        "button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );

    firstFocusable?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSidebar();
        menuButtonRef.current?.focus();
        return;
      }

      if (
        event.key !== "Tab" ||
        !sidebar
      ) {
        return;
      }

      const focusableElements = Array.from(
        sidebar.querySelectorAll<HTMLElement>(
          "button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])"
        )
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.offsetParent !== null
      );

      if (!focusableElements.length) {
        return;
      }

      const first = focusableElements[0];
      const last =
        focusableElements[
          focusableElements.length - 1
        ];

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.classList.remove(
        "cp-mobile-menu-open"
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [sidebarOpen]);

  return (
    <div className="shell shell-premium cp-responsive-shell">
      <header className="cp-mobile-dashboard-header">
        <button
          ref={menuButtonRef}
          type="button"
          className="cp-mobile-menu-button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open dashboard navigation"
          aria-expanded={sidebarOpen}
          aria-controls="clientpilot-dashboard-sidebar"
        >
          <span />
          <span />
          <span />
        </button>

        <Link
          href="/dashboard"
          className="cp-mobile-header-brand"
          aria-label="ClientPilot AI Dashboard"
        >
          <span>CP</span>
        </Link>

        <div className="cp-mobile-header-title">
          <small>ClientPilot AI</small>
          <strong>{pageTitle}</strong>
        </div>

        <Link
          href="/dashboard/support"
          className="cp-mobile-support-link"
          aria-label="Open Support Center"
        >
          ?
        </Link>

        {isOwner ? (
          <Link
            href="/dashboard/owner"
            className="cp-mobile-owner-link"
            aria-label="Open Owner Dashboard"
          >
            O
          </Link>
        ) : null}
      </header>

      <button
        type="button"
        className={`cp-mobile-sidebar-overlay ${
          sidebarOpen ? "is-visible" : ""
        }`}
        onClick={closeSidebar}
        aria-label="Close dashboard navigation"
        tabIndex={sidebarOpen ? 0 : -1}
      />

      <div
        ref={sidebarContainerRef}
        className={`cp-sidebar-container ${
          sidebarOpen ? "is-open" : ""
        }`}
      >
        <DashboardSidebar
          userEmail={userEmail}
          isSignedIn={isSignedIn}
          isOwner={isOwner}
          mobileOpen={sidebarOpen}
          onClose={closeSidebar}
          onNavigate={closeSidebar}
        />
      </div>

      <main className="main main-premium cp-responsive-main">
        {isSignedIn ? (
          <div className="cp-dashboard-support-bar">
            <DashboardHelpButton
              userEmail={userEmail || null}
            />
          </div>
        ) : null}

        {children}
      </main>
    </div>
  );
}
