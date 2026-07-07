export type PlanId = "free" | "starter" | "pro" | "agency";

export type PlanConfig = {
  id: PlanId;
  name: string;
  priceLabel: string;
  monthlyMeetingLimit: number;
  userLimit: number;
  features: string[];
  stripePriceEnv?: string;
};

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free Trial",
    priceLabel: "$0",
    monthlyMeetingLimit: 5,
    userLimit: 1,
    features: [
      "5 meeting uploads per month",
      "Basic client memory",
      "Demo AI mode",
      "Proposal generator"
    ]
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceLabel: "$19/month",
    monthlyMeetingLimit: 20,
    userLimit: 1,
    stripePriceEnv: "STRIPE_STARTER_PRICE_ID",
    features: [
      "20 meeting uploads per month",
      "Client memory",
      "AI summaries",
      "Proposal generator",
      "White-label settings"
    ]
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "$49/month",
    monthlyMeetingLimit: 100,
    userLimit: 3,
    stripePriceEnv: "STRIPE_PRO_PRICE_ID",
    features: [
      "100 meeting uploads per month",
      "Advanced client memory",
      "AI summaries",
      "Premium proposal PDF",
      "Custom logo branding"
    ]
  },
  agency: {
    id: "agency",
    name: "Agency",
    priceLabel: "$99/month",
    monthlyMeetingLimit: 500,
    userLimit: 10,
    stripePriceEnv: "STRIPE_AGENCY_PRICE_ID",
    features: [
      "500 meeting uploads per month",
      "Agency-level workspace",
      "Team-ready limits",
      "White-label proposals",
      "Priority SaaS setup"
    ]
  }
};

export function normalizePlan(plan: string | null | undefined): PlanId {
  if (plan === "starter" || plan === "pro" || plan === "agency") {
    return plan;
  }

  return "free";
}

export function getStripePriceId(plan: PlanId) {
  const config = PLANS[plan];

  if (!config.stripePriceEnv) {
    return null;
  }

  return process.env[config.stripePriceEnv] || null;
}