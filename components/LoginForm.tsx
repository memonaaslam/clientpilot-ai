"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
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
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        setLoading(false);
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
          setError(error.message);
          setLoading(false);
          return;
        }

        if (data.session) {
          router.push("/dashboard");
          router.refresh();
          return;
        }

        setMessage("Account created. Please check your email to confirm your account, then login.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function sendMagicLink() {
    setLoading(true);
    setMessage("");
    setError("");

    const origin = window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`
      }
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Magic link sent. Please check your email.");
    }

    setLoading(false);
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
          {loading
            ? "Please wait..."
            : mode === "signin"
              ? "Sign In"
              : "Create Account"}
        </button>

        {mode === "signin" ? (
          <button
            className="btn secondary"
            type="button"
            onClick={sendMagicLink}
            disabled={loading || !email}
          >
            Send Magic Link Instead
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