"use client";

import { useState } from "react";

import type { PlanId } from "@/lib/plans";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function CheckoutButton({
  plan
}: {
  plan: PlanId;
}) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    if (plan === "free" || loading) {
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("Please log in before subscribing.");

        window.location.href = "/clientpilotai/login";
        return;
      }

      const response = await fetch(
        "/clientpilotai/api/safepay/checkout",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            plan
          })
        }
      );

      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to create Safepay checkout."
        );
      }

      if (
        !result.url ||
        !result.url.startsWith("https://")
      ) {
        throw new Error(
          "Safepay returned an invalid checkout URL."
        );
      }

      window.location.href = result.url;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to open checkout.";

      console.error("Safepay checkout error:", error);

      alert(
        `${message} Please contact info@makzora.com if the problem continues.`
      );
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
      {loading
        ? "Opening secure checkout..."
        : "Subscribe"}
    </button>
  );
}
