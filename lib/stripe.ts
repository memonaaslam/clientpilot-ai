import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is missing.");
  }

  return new Stripe(key, {
    apiVersion: "2026-06-24.dahlia"
  });
}

export function getStripePriceId(plan: string) {
  if (plan === "starter") return process.env.STRIPE_STARTER_PRICE_ID;
  if (plan === "pro") return process.env.STRIPE_PRO_PRICE_ID;
  if (plan === "agency") return process.env.STRIPE_AGENCY_PRICE_ID;

  return process.env.STRIPE_STARTER_PRICE_ID;
}