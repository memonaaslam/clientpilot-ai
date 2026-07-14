export type PlanId =
  | "free"
  | "starter"
  | "pro"
  | "agency";

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

  // Total users include the owner.
  users: number;
  userLimit: number;

  // Number of sales staff accounts allowed.
  includedSalesUsers: number;

  features: string[];
};

export const PLANS:
  Record<PlanId, PlanConfig> = {
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
        "1 owner account",
        "No sales users",
        "Client memory CRM",
        "Smart meeting summaries",
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
      users: 2,
      userLimit: 2,
      includedSalesUsers: 1,
      features: [
        "20 smart meetings per month",
        "1 owner account",
        "1 included sales user",
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
      users: 3,
      userLimit: 3,
      includedSalesUsers: 2,
      features: [
        "80 smart meetings per month",
        "1 owner account",
        "2 included sales users",
        "Lead scoring",
        "Lost lead rescue",
        "Advanced proposal workflow",
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
      users: 6,
      userLimit: 6,
      includedSalesUsers: 5,
      features: [
        "300 smart meetings per month",
        "1 owner account",
        "5 included sales users",
        "Owner command center",
        "Sales team activity tracking",
        "Agency follow-up command center",
        "Team performance visibility"
      ]
    }
  };

export function normalizePlan(
  plan?: string | null
): PlanId {
  const value = String(plan || "")
    .trim()
    .toLowerCase();

  if (
    value === "starter" ||
    value === "pro" ||
    value === "agency"
  ) {
    return value;
  }

  return "free";
}

export function getPlanConfig(
  plan?: string | null
): PlanConfig {
  return PLANS[
    normalizePlan(plan)
  ];
}

export function getMeetingLimit(
  plan?: string | null
): number {
  return getPlanConfig(
    plan
  ).monthlyMeetingLimit;
}

export function getSalesUserLimit(
  plan?: string | null
): number {
  return getPlanConfig(
    plan
  ).includedSalesUsers;
}

export function getTotalUserLimit(
  plan?: string | null
): number {
  return getPlanConfig(
    plan
  ).userLimit;
}
