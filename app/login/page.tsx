import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="modern-auth-page">
      <div className="modern-auth-shell">
        <div className="modern-auth-header">
          <span className="badge">Secure Access</span>
          <h1>Welcome to ClientPilot AI</h1>
          <p>
            Sign in, create your workspace, or reset your password securely.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}