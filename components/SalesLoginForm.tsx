"use client";

import { useState } from "react";

export function SalesLoginForm() {
  const [staffId, setStaffId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/clientpilotai/api/sales-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          staff_id: staffId.trim(),
          pin: pin.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid Staff ID or PIN.");
        return;
      }

      window.location.href = data.redirectTo || "/sales/dashboard";
    } catch {
      setError("Login failed. Please check Staff ID, PIN, and deployment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="sales-login-form" onSubmit={login}>
      <label>
        Staff ID
        <input
          value={staffId}
          onChange={(event) => setStaffId(event.target.value)}
          required
        />
      </label>

      <label>
        PIN
        <input
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          type="password"
          required
        />
      </label>

      {error ? <p className="auth-error">{error}</p> : null}

      <button disabled={loading}>
        {loading ? "Opening..." : "Open Sales Workspace"}
      </button>
    </form>
  );
}