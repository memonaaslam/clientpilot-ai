import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PLANS, normalizePlan, type PlanId } from "@/lib/plans";

export type UserSubscription = {
  plan: PlanId;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
};

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("subscriptions")
    .select("plan,status,stripe_customer_id,stripe_subscription_id,current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return {
      plan: "free",
      status: "inactive",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null
    };
  }

  const activeStatuses = ["active", "trialing"];
  const plan = activeStatuses.includes(data.status)
    ? normalizePlan(data.plan)
    : "free";

  return {
    plan,
    status: data.status || "inactive",
    stripeCustomerId: data.stripe_customer_id || null,
    stripeSubscriptionId: data.stripe_subscription_id || null,
    currentPeriodEnd: data.current_period_end || null
  };
}

export async function getMonthlyMeetingUsage(userId: string) {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count } = await supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  return count || 0;
}

export async function getPlanLimitStatus(userId: string) {
  const subscription = await getUserSubscription(userId);
  const usage = await getMonthlyMeetingUsage(userId);
  const planConfig = PLANS[subscription.plan];

  return {
    subscription,
    usage,
    limit: planConfig.monthlyMeetingLimit,
    remaining: Math.max(planConfig.monthlyMeetingLimit - usage, 0),
    allowed: usage < planConfig.monthlyMeetingLimit,
    planConfig
  };
}