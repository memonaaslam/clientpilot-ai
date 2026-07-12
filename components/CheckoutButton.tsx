"use client";

import { useState } from "react";
import type { PlanId } from "@/lib/plans";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const LEMON_CHECKOUT_LINKS: Record<Exclude<PlanId, "free">, string> = {
  starter:
    "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/43096221-9517-4b43-8b1c-741fef30d87f",
  pro:
    "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/379bf850-dce0-4e3c-a727-71e69ce1cf39",
  agency:
    "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/7d490de8-6878-44e1-ae4b-806776fe4a90"
};

export function CheckoutButton({ plan }: { plan: PlanId }) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    if (plan === "free") {
      return;
    }

    setLoading(true);

    try {
      const checkoutUrl = LEMON_CHECKOUT_LINKS[plan];

      if (!checkoutUrl) {
        alert("Checkout link is not configured for this plan.");
        return;
      }

      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
        error
      } = await supabase.auth.getUser();

      if (error || !user) {
        alert("Please log in before subscribing.");
        window.location.href = "/clientpilotai/login";
        return;
      }

      const url = new URL(checkoutUrl);

      url.searchParams.set(
        "checkout[custom][user_id]",
        user.id
      );

      url.searchParams.set(
        "checkout[custom][plan]",
        plan
      );

      if (user.email) {
        url.searchParams.set(
          "checkout[custom][email]",
          user.email
        );

        url.searchParams.set(
          "checkout[email]",
          user.email
        );
      }

      window.location.href = url.toString();
    } catch {
      alert("Unable to open checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (plan === "free") {
    return null;
  }

  return (
    <button
      className="btn gold"
      type="button"
      onClick={() => void startCheckout()}
      disabled={loading}
    >
      {loading ? "Opening checkout..." : "Subscribe"}
    </button>
  );
}