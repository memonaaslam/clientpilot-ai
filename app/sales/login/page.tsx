import Link from "next/link";
import { SalesLoginForm } from "@/components/SalesLoginForm";

export default function SalesLoginPage() {
  return (
    <main className="sales-login-page">
      <section className="sales-login-card">
        <Link href="/" className="cp-logo cp-logo-pro">
          <span className="logo-symbol">ClientPilot</span>
          <b>AI</b>
        </Link>

        <span className="badge">Sales Staff Login</span>

        <h1>Open your sales workspace.</h1>

        <p>
          Login with your Staff ID and PIN provided by the workspace owner.
        </p>

        <SalesLoginForm />

        <Link href="/login" className="sales-owner-link">
          Owner login
        </Link>
      </section>
    </main>
  );
}