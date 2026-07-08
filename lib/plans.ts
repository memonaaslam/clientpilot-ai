export type PlanKey = "free" | "starter" | "pro" | "agency";

export type PlanConfig = {
  key: PlanKey;
  name: string;
  price: string;
  meetingsPerMonth: number;
  users: number;
  includedSalesUsers: number;
  features: string[];
};

export const PLANS: Record<PlanKey, PlanConfig> = {
  free: {
    key: "free",
    name: "Free",
    price: "$0",
    meetingsPerMonth: 5,
    users: 1,
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
    name: "Starter",
    price: "$19/month",
    meetingsPerMonth: 20,
    users: 1,
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
    name: "Pro",
    price: "$39/month",
    meetingsPerMonth: 80,
    users: 1,
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
    name: "Agency",
    price: "$80/month",
    meetingsPerMonth: 300,
    users: 4,
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

export function getPlanConfig(plan?: string | null) {
  if (plan === "starter" || plan === "pro" || plan === "agency") {
    return PLANS[plan];
  }

  return PLANS.free;
}