import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="login-page-clean">
      <section className="login-shell-clean">
        <Link href="/" className="login-brand-clean">
          ClientPilot<span>AI</span>
        </Link>

        <div className="login-copy-clean">
          <span className="badge">Secure Access</span>
          <h1>Welcome Back</h1>
          <p>Sign in, create your workspace, or reset your password securely.</p>
        </div>

        <LoginForm />

        <div className="login-legal-links">
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/refund-policy">Refunds</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </section>
    </main>
  );
}