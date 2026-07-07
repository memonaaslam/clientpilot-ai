import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-06-24.dahlia"
});

export function getStripePriceId(plan: string) {
  const normalized = plan.toLowerCase();
  if (normalized === "starter") return process.env.STRIPE_STARTER_PRICE_ID!;
  if (normalized === "business") return process.env.STRIPE_BUSINESS_PRICE_ID!;
  if (normalized === "agency") return process.env.STRIPE_AGENCY_PRICE_ID!;
  throw new Error("Invalid plan selected");
}
