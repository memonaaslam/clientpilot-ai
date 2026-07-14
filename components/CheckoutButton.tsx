"use client";

import { useState } from "react";

import type {
  PlanId
} from "@/lib/plans";

import {
  createSupabaseBrowserClient
} from "@/lib/supabase-browser";

type PaidPlan =
  Exclude<PlanId, "free">;

const LEMON_CHECKOUT_LINKS:
  Record<PaidPlan, string | undefined> = {
    starter:
      process.env
        .NEXT_PUBLIC_LEMON_STARTER_CHECKOUT_URL,

    pro:
      process.env
        .NEXT_PUBLIC_LEMON_PRO_CHECKOUT_URL,

    agency:
      process.env
        .NEXT_PUBLIC_LEMON_AGENCY_CHECKOUT_URL
  };

function getCheckoutUrl(
  plan: PaidPlan
) {
  const value =
    LEMON_CHECKOUT_LINKS[plan]?.trim();

  if (!value) {
    throw new Error(
      `${plan} checkout URL is not configured.`
    );
  }

  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(
      "lemonsqueezy.com"
    )
  ) {
    throw new Error(
      `${plan} checkout URL is invalid.`
    );
  }

  return url;
}

export function CheckoutButton({
  plan
}: {
  plan: PlanId;
}) {
  const [loading, setLoading] =
    useState(false);

  async function startCheckout() {
    if (plan === "free") {
      return;
    }

    setLoading(true);

    try {
      const supabase =
        createSupabaseBrowserClient();

      const {
        data: { user },
        error
      } = await supabase.auth.getUser();

      if (error || !user) {
        alert(
          "Please log in before subscribing."
        );

        window.location.href =
          "/clientpilotai/login";

        return;
      }

      const url =
        getCheckoutUrl(plan);

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

      window.location.href =
        url.toString();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to open checkout.";

      console.error(
        "Lemon Squeezy checkout error:",
        error
      );

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
      onClick={() =>
        void startCheckout()
      }
      disabled={loading}
    >
      {loading
        ? "Opening checkout..."
        : "Subscribe"}
    </button>
  );
}
