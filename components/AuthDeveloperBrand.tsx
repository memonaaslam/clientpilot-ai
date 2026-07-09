"use client";

import { usePathname } from "next/navigation";

export function AuthDeveloperBrand() {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/register";

  if (!isAuthPage) return null;

  return (
    <div className="auth-dev-brand">
      <strong>ClientPilot AI</strong>
      <small>Smart CRM • Follow-up Automation • Proposal Workflow</small>

      <div className="auth-dev-line" />

      <span>Software Developed by</span>
      <img src="/makzora-logo-official.png?v=official" alt="Makzora" />
    </div>
  );
}
