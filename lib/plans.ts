export type PlanId = "free" | "starter" | "pro" | "agency";
export type PlanKey = PlanId;

export type PlanConfig = {
  key: PlanId;
  id: PlanId;
  name: string;
  price: string;
  priceLabel: string;
  monthlyPrice: number;
  meetingsPerMonth: number;
  monthlyMeetingLimit: number;
  users: number;
  userLimit: number;
  includedSalesUsers: number;
  features: string[];
};

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    key: "free",
    id: "free",
    name: "Free",
    price: "$0",
    priceLabel: "$0",
    monthlyPrice: 0,
    meetingsPerMonth: 5,
    monthlyMeetingLimit: 5,
    users: 1,
    userLimit: 1,
    includedSalesUsers: 0,
    features: [
      "5 smart meetings per month",
      "Client memory CRM",
      "Smart summaries",
      "Tasks and reminders",
      "Proposal builder"
    ]
  },
  starter: {
    key: "starter",
    id: "starter",
    name: "Starter",
    price: "$19/month",
    priceLabel: "$19/month",
    monthlyPrice: 19,
    meetingsPerMonth: 20,
    monthlyMeetingLimit: 20,
    users: 1,
    userLimit: 1,
    includedSalesUsers: 0,
    features: [
      "20 smart meetings per month",
      "Client memory CRM",
      "Proposal builder",
      "Follow-up reminders",
      "Google Calendar reminder links"
    ]
  },
  pro: {
    key: "pro",
    id: "pro",
    name: "Pro",
    price: "$39/month",
    priceLabel: "$39/month",
    monthlyPrice: 39,
    meetingsPerMonth: 80,
    monthlyMeetingLimit: 80,
    users: 1,
    userLimit: 1,
    includedSalesUsers: 0,
    features: [
      "80 smart meetings per month",
      "Lead scoring",
      "Lost lead rescue",
      "Proposal follow-up workflow",
      "Priority workspace"
    ]
  },
  agency: {
    key: "agency",
    id: "agency",
    name: "Agency",
    price: "$80/month",
    priceLabel: "$80/month",
    monthlyPrice: 80,
    meetingsPerMonth: 300,
    monthlyMeetingLimit: 300,
    users: 4,
    userLimit: 4,
    includedSalesUsers: 3,
    features: [
      "300 smart meetings per month",
      "Owner workspace",
      "3 included sales users",
      "Sales team activity tracking",
      "Agency follow-up command center",
      "Custom team add-on available"
    ]
  }
};

export function normalizePlan(plan?: string | null): PlanId {
  const value = String(plan || "").toLowerCase();

  if (value === "starter" || value === "pro" || value === "agency") {
    return value;
  }

  return "free";
}

export function getPlanConfig(plan?: string | null): PlanConfig {
  return PLANS[normalizePlan(plan)];
}

export function getStripePriceId(plan?: string | null) {
  const normalized = normalizePlan(plan);

  if (normalized === "starter") return process.env.STRIPE_STARTER_PRICE_ID || "";
  if (normalized === "pro") return process.env.STRIPE_PRO_PRICE_ID || "";
  if (normalized === "agency") return process.env.STRIPE_AGENCY_PRICE_ID || "";

  return "";
}