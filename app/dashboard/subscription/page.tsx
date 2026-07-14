import {
  CheckoutButton
} from "@/components/CheckoutButton";

import {
  DashboardShell
} from "@/components/DashboardShell";

import {
  PLANS,
  type PlanId
} from "@/lib/plans";

import {
  getPlanLimitStatus
} from "@/lib/subscription";

import {
  createSupabaseServerClient
} from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const PLAN_RANK:
  Record<PlanId, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    agency: 3
  };

function formatPeriodEnd(
  value?: string | null
) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      dateStyle: "medium"
    }
  ).format(date);
}

export default async function SubscriptionPage() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardShell>
        <div className="empty-state">
          <h2>Please sign in first</h2>

          <p className="muted">
            Login to view your subscription,
            usage, and plan limits.
          </p>
        </div>
      </DashboardShell>
    );
  }

  const limitStatus =
    await getPlanLimitStatus(user.id);

  const currentPlan =
    limitStatus.subscription.plan;

  const currentRank =
    PLAN_RANK[currentPlan];

  const usagePercent =
    limitStatus.limit > 0
      ? Math.min(
          Math.round(
            (limitStatus.usage /
              limitStatus.limit) *
              100
          ),
          100
        )
      : 0;

  const planOrder: PlanId[] = [
    "free",
    "starter",
    "pro",
    "agency"
  ];

  const periodEnd = formatPeriodEnd(
    limitStatus.subscription
      .currentPeriodEnd
  );

  const subscriptionStatus =
    String(
      limitStatus.subscription.status ||
        "inactive"
    ).toLowerCase();

  return (
    <DashboardShell>
      <div className="subscription-clean-page">
        <div className="subscription-clean-hero">
          <div>
            <span className="badge">
              Subscription
            </span>

            <h1>Plans &amp; Usage</h1>

            <p>
              Manage your ClientPilot AI plan,
              meeting allowance, and included sales
              users.
            </p>
          </div>

          <div className="subscription-usage-card">
            <span>
              Meetings this month
            </span>

            <strong>
              {limitStatus.usage}/
              {limitStatus.limit}
            </strong>

            <div className="usage-bar">
              <i
                style={{
                  width:
                    `${usagePercent}%`
                }}
              />
            </div>
          </div>
        </div>

        <div className="current-plan-clean">
          <div>
            <span>Current Plan</span>

            <h2>
              {PLANS[currentPlan].name}
            </h2>

            <p>
              You have{" "}
              <strong>
                {limitStatus.remaining}
              </strong>{" "}
              meeting upload
              {limitStatus.remaining === 1
                ? ""
                : "s"}{" "}
              remaining this month.
            </p>

            {subscriptionStatus ===
              "cancelled" &&
            periodEnd ? (
              <p>
                Your plan is cancelled but remains
                active until{" "}
                <strong>{periodEnd}</strong>.
              </p>
            ) : null}

            {subscriptionStatus ===
              "past_due" &&
            periodEnd ? (
              <p>
                Payment recovery is pending. Access
                currently remains available until{" "}
                <strong>{periodEnd}</strong>.
              </p>
            ) : null}
          </div>

          <div className="current-plan-number">
            {limitStatus.limit}

            <small>
              monthly uploads
            </small>
          </div>
        </div>

        <div className="pricing-grid-clean">
          {planOrder.map((planId) => {
            const plan = PLANS[planId];

            const isCurrent =
              currentPlan === planId;

            const isLowerPlan =
              PLAN_RANK[planId] <
              currentRank;

            const isUpgrade =
              PLAN_RANK[planId] >
              currentRank;

            return (
              <article
                className={
                  isCurrent
                    ? "pricing-card-clean active"
                    : "pricing-card-clean"
                }
                key={plan.id}
              >
                <div className="pricing-top-clean">
                  <span className="pill soft">
                    {isCurrent
                      ? "Current Plan"
                      : isLowerPlan
                        ? "Lower Plan"
                        : planId === "free"
                          ? "Free Forever"
                          : "Upgrade"}
                  </span>

                  <h3>{plan.name}</h3>

                  <div className="pricing-price-clean">
                    {plan.priceLabel}
                  </div>

                  <p>
                    {plan.monthlyMeetingLimit}{" "}
                    meetings/month ·{" "}
                    {plan.includedSalesUsers === 0
                      ? "No sales users"
                      : `${plan.includedSalesUsers} sales user${
                          plan.includedSalesUsers ===
                          1
                            ? ""
                            : "s"
                        }`}
                  </p>
                </div>

                <ul className="pricing-list-clean">
                  {plan.features.map(
                    (feature) => (
                      <li key={feature}>
                        {feature}
                      </li>
                    )
                  )}
                </ul>

                <div className="pricing-action-clean">
                  {isCurrent ? (
                    <button
                      className="btn secondary"
                      type="button"
                      disabled
                    >
                      Active
                    </button>
                  ) : isLowerPlan ? (
                    <button
                      className="btn secondary"
                      type="button"
                      disabled
                    >
                      Lower than{" "}
                      {PLANS[currentPlan].name}
                    </button>
                  ) : isUpgrade ? (
                    <CheckoutButton
                      plan={plan.id}
                    />
                  ) : (
                    <button
                      className="btn secondary"
                      type="button"
                      disabled
                    >
                      Free Plan
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
