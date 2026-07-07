import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="container" style={{ padding: "70px 0" }}>
      <Link href="/" className="logo">ClientPilot<span>AI</span></Link>
      <div className="card" style={{ maxWidth: 480, marginTop: 40 }}>
        <h1 style={{ fontSize: 42 }}>Login</h1>
        <p className="muted">Sign in with your email and password, create an account, or reset your password securely.</p>
        <LoginForm />
      </div>
    </main>
  );
}
