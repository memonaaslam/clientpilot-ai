import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div>
          <span className="badge">Secure Access</span>
          <h1>Login</h1>
          <p className="muted">
            Sign in with your email and password, create an account, or reset your password securely.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}