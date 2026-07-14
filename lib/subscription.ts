import {
  PLANS,
  normalizePlan,
  type PlanId
} from "@/lib/plans";

import {
  createSupabaseServerClient
} from "@/lib/supabase-server";

export type UserSubscription = {
  plan: PlanId;
  status: string;
  lemonCustomerId: string | null;
  lemonSubscriptionId: string | null;
  currentPeriodEnd: string | null;
};

type SubscriptionRow = {
  plan?: string | null;
  status?: string | null;
  lemon_customer_id?: string | null;
  lemon_subscription_id?: string | null;
  current_period_end?: string | null;
};

function isFutureDate(
  value?: string | null
) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() > Date.now()
  );
}

function subscriptionHasAccess(
  row: SubscriptionRow
) {
  const status = String(
    row.status || ""
  )
    .trim()
    .toLowerCase();

  if (
    [
      "active",
      "trialing",
      "on_trial"
    ].includes(status)
  ) {
    return true;
  }

  /*
    Lemon Squeezy may mark a subscription as
    cancelled immediately while access remains
    valid until current_period_end.
  */
  if (
    status === "cancelled" &&
    isFutureDate(row.current_period_end)
  ) {
    return true;
  }

  /*
    Keep access during a temporary payment-recovery
    period when the paid period has not yet ended.
  */
  if (
    status === "past_due" &&
    isFutureDate(row.current_period_end)
  ) {
    return true;
  }

  return false;
}

export async function getUserSubscription(
  userId: string
): Promise<UserSubscription> {
  const supabase =
    await createSupabaseServerClient();

  const {
    data,
    error
  } = await supabase
    .from("subscriptions")
    .select(
      [
        "plan",
        "status",
        "lemon_customer_id",
        "lemon_subscription_id",
        "current_period_end"
      ].join(",")
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load user subscription:",
      error
    );
  }

  if (!data) {
    return {
      plan: "free",
      status: "inactive",
      lemonCustomerId: null,
      lemonSubscriptionId: null,
      currentPeriodEnd: null
    };
  }

  const row =
    data as unknown as SubscriptionRow;

  const plan = subscriptionHasAccess(row)
    ? normalizePlan(row.plan)
    : "free";

  return {
    plan,
    status:
      String(row.status || "inactive"),
    lemonCustomerId:
      row.lemon_customer_id || null,
    lemonSubscriptionId:
      row.lemon_subscription_id || null,
    currentPeriodEnd:
      row.current_period_end || null
  };
}

export async function getMonthlyMeetingUsage(
  userId: string
) {
  const supabase =
    await createSupabaseServerClient();

  const now = new Date();

  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  const {
    count,
    error
  } = await supabase
    .from("meetings")
    .select(
      "id",
      {
        count: "exact",
        head: true
      }
    )
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  if (error) {
    console.error(
      "Unable to load monthly meeting usage:",
      error
    );
  }

  return count || 0;
}

export async function getPlanLimitStatus(
  userId: string
) {
  const subscription =
    await getUserSubscription(userId);

  const usage =
    await getMonthlyMeetingUsage(userId);

  const planConfig =
    PLANS[subscription.plan];

  const limit =
    planConfig.monthlyMeetingLimit;

  return {
    subscription,
    usage,
    limit,
    remaining: Math.max(
      limit - usage,
      0
    ),
    allowed: usage < limit,
    planConfig
  };
}
