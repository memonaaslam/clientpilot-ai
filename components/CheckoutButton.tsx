"use client";

import { useState } from "react";
import type { PlanId } from "@/lib/plans";

export function CheckoutButton({ plan }: { plan: PlanId }) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ plan })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Unable to start checkout.");
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      alert("Unable to start checkout.");
      setLoading(false);
    }
  }

  if (plan === "free") {
    return null;
  }

  return (
    <button className="btn gold" type="button" onClick={startCheckout} disabled={loading}>
      {loading ? "Opening Stripe..." : "Upgrade"}
    </button>
  );
}