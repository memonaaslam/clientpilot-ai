import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        padding: "36px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top left, rgba(230,195,106,.18), transparent 34%), radial-gradient(circle at bottom right, rgba(255,255,255,.08), transparent 30%), linear-gradient(135deg, #080806 0%, #15120c 48%, #080806 100%)"
      }}
    >
      <section style={{ width: "100%", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <div style={{ marginBottom: 24 }}>
          <span
            style={{
              display: "inline-flex",
              borderRadius: 999,
              padding: "8px 12px",
              border: "1px solid rgba(230,195,106,.25)",
              color: "#e6c36a",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: ".12em",
              textTransform: "uppercase"
            }}
          >
            Secure Access
          </span>

          <h1
            style={{
              margin: "16px 0 10px",
              color: "#fff",
              fontSize: 44,
              lineHeight: 1.05,
              letterSpacing: "-.04em"
            }}
          >
            Welcome to ClientPilot AI
          </h1>

          <p style={{ margin: "0 auto", maxWidth: 420, color: "rgba(255,255,255,.62)", lineHeight: 1.6 }}>
            Sign in, create your workspace, or reset your password securely.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}