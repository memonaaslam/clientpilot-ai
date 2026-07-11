"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function getErrorMessage(error: unknown) {
  if (!error) return "Something went wrong. Please try again.";
  if (typeof error === "string") return error === "{}" ? "Something went wrong. Please try again." : error;

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message?: unknown }).message || "").trim();
    return message && message !== "{}" ? message : "Something went wrong. Please try again.";
  }

  return "Something went wrong. Please try again.";
}

export function LoginForm() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [rememberEmail, setRememberEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedRemember = localStorage.getItem("clientpilot_remember_email");
    const savedEmail = localStorage.getItem("clientpilot_saved_email");

    if (savedRemember === "true" && savedEmail) {
      setRememberEmail(true);
      setEmail(savedEmail);
    }
  }, []);

  function saveRememberPreference(currentEmail: string) {
    if (rememberEmail) {
      localStorage.setItem("clientpilot_remember_email", "true");
      localStorage.setItem("clientpilot_saved_email", currentEmail);
    } else {
      localStorage.removeItem("clientpilot_remember_email");
      localStorage.removeItem("clientpilot_saved_email");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (!email || !password) {
        setError("Please enter email and password.");
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      saveRememberPreference(email);

      if (mode === "signup") {
        const origin = window.location.origin;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
            data: {
              full_name: name
            }
          }
        });

        if (error) {
          setError(getErrorMessage(error));
          return;
        }

        if (data.session) {
          router.push("/dashboard");
          router.refresh();
          return;
        }

        setMessage("Account created. You can now sign in.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setError(getErrorMessage(error));
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function sendResetPassword() {
    setResetLoading(true);
    setMessage("");
    setError("");

    try {
      if (!email) {
        setError("Please enter your email first.");
        return;
      }

      saveRememberPreference(email);

      const response = await fetch("/clientpilotai/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(String(data.error || "Unable to send password reset email."));
        return;
      }

      setMessage(String(data.message || "Password reset email sent. Please check your inbox or spam folder."));
    } catch {
      setError("Unable to send password reset email. Please check SMTP settings.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="login-card-clean">
      <div className="login-tabs-clean">
        <button
          type="button"
          className={mode === "signin" ? "active" : ""}
          onClick={() => {
            setMode("signin");
            setMessage("");
            setError("");
          }}
        >
          Sign In
        </button>

        <button
          type="button"
          className={mode === "signup" ? "active" : ""}
          onClick={() => {
            setMode("signup");
            setMessage("");
            setError("");
          }}
        >
          Create Account
        </button>
      </div>

      <form className="login-form-clean" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <input
            type="text"
            placeholder="Full name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        ) : null}

        <input
          type="email"
          placeholder="Email address"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <label className="remember-row-clean">
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(event) => setRememberEmail(event.target.checked)}
          />
          <span>Remember my email on this device</span>
        </label>

        {error ? <p className="auth-error">{error}</p> : null}
        {message ? <p className="auth-message">{message}</p> : null}

        <button className="login-submit-clean" type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
        </button>

        {mode === "signin" ? (
          <button
            className="login-reset-clean"
            type="button"
            onClick={sendResetPassword}
            disabled={resetLoading || !email}
          >
            {resetLoading ? "Sending reset email..." : "Forgot password?"}
          </button>
        ) : null}
      </form>

      <p className="login-note-clean">
        {mode === "signin"
          ? "Login with your workspace email and password."
          : "Create your ClientPilot AI workspace account."}
      </p>
    </div>
  );
}