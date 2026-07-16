import Link from "next/link";

import {
  MakzoraOwnerLoginForm
} from "@/components/MakzoraOwnerLoginForm";

export default function MakzoraOwnerLoginPage() {
  return (
    <main className="mk-owner-login-page">
      <section className="mk-owner-login-card">
        <div className="mk-owner-login-brand">
          <img
            src="/clientpilotai/makzora-logo-official.png?v=official"
            alt="Makzora"
          />

          <span>Private owner access</span>

          <h1>Makzora Owner Dashboard</h1>

          <p>
            Sign in with your authorized Makzora
            owner account. This workspace is
            separate from ClientPilot AI customer
            accounts.
          </p>
        </div>

        <MakzoraOwnerLoginForm />

        <div className="mk-owner-login-note">
          <strong>Private workspace</strong>

          <p>
            Customers and sales users cannot access
            Makzora revenue, profit, expenses,
            investments or product reports.
          </p>
        </div>

        <Link
          href="/"
          className="mk-owner-login-back"
        >
          Return to ClientPilot AI website
        </Link>
      </section>
    </main>
  );
}
