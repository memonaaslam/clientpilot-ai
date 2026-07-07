"use client";

import { useState } from "react";
import type { PlanId } from "@/lib/plans";

const LEMON_CHECKOUT_LINKS: Record<Exclude<PlanId, "free">, string> = {
  starter: "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/7d490de8-6878-44e1-ae4b-806776fe4a90",
  pro: "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/379bf850-dce0-4e3c-a727-71e69ce1cf39",
  agency: "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/43096221-9517-4b43-8b1c-741fef30d87f"
};

export function CheckoutButton({ plan }: { plan: PlanId }) {
  const [loading, setLoading] = useState(false);

  function startCheckout() {
    if (plan === "free") {
      return;
    }

    setLoading(true);

    const checkoutUrl = LEMON_CHECKOUT_LINKS[plan];

    if (!checkoutUrl) {
      alert("Checkout link is not configured for this plan.");
      setLoading(false);
      return;
    }

    window.location.href = checkoutUrl;
  }

  if (plan === "free") {
    return null;
  }

  return (
    <button className="btn gold" type="button" onClick={startCheckout} disabled={loading}>
      {loading ? "Opening checkout..." : "Subscribe"}
    </button>
  );
}