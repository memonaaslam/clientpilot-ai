"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

      const response = await fetch("/api/auth/reset-password", {
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

  const inputStyle = {
    width: "100%",
    minHeight: 52,
    borderRadius: 16,
    border: "1px solid rgba(230,195,106,.18)",
    background: "rgba(255,255,255,.06)",
    color: "#fff",
    padding: "0 16px",
    outline: "none",
    fontSize: 15
  };

  return (
    <div
      style={{
        width: "100%",
        borderRadius: 30,
        padding: 26,
        border: "1px solid rgba(230,195,106,.25)",
        background: "rgba(15,14,10,.88)",
        boxShadow: "0 30px 100px rgba(0,0,0,.5)",
        backdropFilter: "blur(18px)"
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 18,
          padding: 6,
          borderRadius: 18,
          background: "rgba(255,255,255,.06)"
        }}
      >
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setMessage("");
            setError("");
          }}
          style={{
            border: 0,
            borderRadius: 14,
            padding: "12px 10px",
            cursor: "pointer",
            fontWeight: 800,
            color: mode === "signin" ? "#111" : "#fff",
            background: mode === "signin" ? "#e6c36a" : "transparent"
          }}
        >
          Sign In
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setMessage("");
            setError("");
          }}
          style={{
            border: 0,
            borderRadius: 14,
            padding: "12px 10px",
            cursor: "pointer",
            fontWeight: 800,
            color: mode === "signup" ? "#111" : "#fff",
            background: mode === "signup" ? "#e6c36a" : "transparent"
          }}
        >
          Create Account
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        {mode === "signup" ? (
          <input
            style={inputStyle}
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        ) : null}

        <input
          style={inputStyle}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <input
          style={inputStyle}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error ? (
          <p
            style={{
              margin: 0,
              borderRadius: 14,
              padding: "12px 14px",
              background: "rgba(255,80,80,.12)",
              border: "1px solid rgba(255,120,120,.22)",
              color: "#ffd7d7",
              fontSize: 13
            }}
          >
            {error}
          </p>
        ) : null}

        {message ? (
          <p
            style={{
              margin: 0,
              borderRadius: 14,
              padding: "12px 14px",
              background: "rgba(94,255,170,.10)",
              border: "1px solid rgba(94,255,170,.22)",
              color: "#c8ffe0",
              fontSize: 13
            }}
          >
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          style={{
            minHeight: 52,
            border: 0,
            borderRadius: 16,
            cursor: "pointer",
            fontWeight: 900,
            color: "#111",
            background: "linear-gradient(135deg, #f4d987, #b98b2f)",
            boxShadow: "0 14px 34px rgba(230,195,106,.24)"
          }}
        >
          {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
        </button>

        {mode === "signin" ? (
          <button
            type="button"
            onClick={sendResetPassword}
            disabled={resetLoading || !email}
            style={{
              border: 0,
              background: "transparent",
              color: "#e6c36a",
              cursor: resetLoading || !email ? "not-allowed" : "pointer",
              fontWeight: 800,
              padding: 10,
              opacity: resetLoading || !email ? .55 : 1
            }}
          >
            {resetLoading ? "Sending reset email..." : "Forgot password?"}
          </button>
        ) : null}
      </form>

      <p style={{ margin: "16px 0 0", color: "rgba(255,255,255,.58)", fontSize: 13, textAlign: "center" }}>
        {mode === "signin"
          ? "Login with your workspace email and password."
          : "Create your ClientPilot AI workspace account."}
      </p>
    </div>
  );
}