"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

function getErrorMessage(error: unknown) {
  if (!error) return "Something went wrong. Please try again.";
  if (typeof error === "string") return error;

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (message) return String(message);
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

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

      const origin = window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`
      });

      if (error) {
        setError(getErrorMessage(error));
        return;
      }

      setMessage("Password reset email sent. Please check your inbox or spam folder.");
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "signin" ? "auth-tab active" : "auth-tab"}
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
          className={mode === "signup" ? "auth-tab active" : "auth-tab"}
          onClick={() => {
            setMode("signup");
            setMessage("");
            setError("");
          }}
        >
          Create Account
        </button>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <input
            className="input"
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        ) : null}

        <input
          className="input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error ? <p className="auth-error">{error}</p> : null}
        {message ? <p className="auth-message">{message}</p> : null}

        <button className="btn gold" type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
        </button>

        {mode === "signin" ? (
          <button
            className="btn secondary"
            type="button"
            onClick={sendResetPassword}
            disabled={resetLoading || !email}
          >
            {resetLoading ? "Sending reset email..." : "Forgot Password?"}
          </button>
        ) : null}
      </form>

      <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
        {mode === "signin"
          ? "Login with your email and password."
          : "Create your workspace account to start using ClientPilot AI."}
      </p>
    </div>
  );
}