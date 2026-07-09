"use client";

import { usePathname } from "next/navigation";

export function AuthDeveloperBrand() {
  const pathname = usePathname();

  if (pathname !== "/login" && pathname !== "/signup" && pathname !== "/register") {
    return null;
  }

  return (
    <div className="auth-dev-brand">
      <span>Software Developed by</span>
      <img src="/makzora-logo-official.png" alt="Makzora" />
      <strong>ClientPilot AI</strong>
      <small>Smart CRM • Follow-up Automation • Proposal Workflow</small>
    </div>
  );
}

