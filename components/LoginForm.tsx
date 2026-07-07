"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` }
    });
    setLoading(false);
    setMessage(error ? error.message : "Check your email for the login link.");
  }

  return (
    <form className="form" onSubmit={signIn}>
      <input className="input" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button className="btn gold" disabled={loading}>{loading ? "Sending..." : "Send magic login link"}</button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}
