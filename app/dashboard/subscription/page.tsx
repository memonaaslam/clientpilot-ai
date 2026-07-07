import { CheckoutButton } from "@/components/CheckoutButton";
import { DashboardShell } from "@/components/DashboardShell";
import { PLANS, type PlanId } from "@/lib/plans";
import { getPlanLimitStatus } from "@/lib/subscription";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  agency: 3
};

export default async function SubscriptionPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardShell>
        <div className="empty-state">
          <h2>Please sign in first</h2>
          <p className="muted">Login to view your subscription, usage, and plan limits.</p>
        </div>
      </DashboardShell>
    );
  }

  const limitStatus = await getPlanLimitStatus(user.id);
  const currentPlan = limitStatus.subscription.plan;
  const currentRank = PLAN_RANK[currentPlan];
  const usagePercent = Math.min(Math.round((limitStatus.usage / limitStatus.limit) * 100), 100);

  const planOrder: PlanId[] = ["free", "starter", "pro", "agency"];

  return (
    <DashboardShell>
      <div className="subscription-clean-page">
        <div className="subscription-clean-hero">
          <div>
            <span className="badge">Subscription</span>
            <h1>Plans & Usage</h1>
            <p>
              Manage your ClientPilot AI subscription, plan benefits, and monthly meeting upload limits.
            </p>
          </div>

          <div className="subscription-usage-card">
            <span>Meetings this month</span>
            <strong>{limitStatus.usage}/{limitStatus.limit}</strong>
            <div className="usage-bar">
              <i style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
        </div>

        <div className="current-plan-clean">
          <div>
            <span>Current Plan</span>
            <h2>{PLANS[currentPlan].name}</h2>
            <p>
              You have <strong>{limitStatus.remaining}</strong> meeting uploads remaining this month.
            </p>
          </div>

          <div className="current-plan-number">
            {limitStatus.limit}
            <small>monthly uploads</small>
          </div>
        </div>

        <div className="pricing-grid-clean">
          {planOrder.map((planId) => {
            const plan = PLANS[planId];
            const isCurrent = currentPlan === planId;
            const isLowerPlan = PLAN_RANK[planId] < currentRank;
            const isUpgrade = PLAN_RANK[planId] > currentRank;

            return (
              <article
                className={isCurrent ? "pricing-card-clean active" : "pricing-card-clean"}
                key={plan.id}
              >
                <div className="pricing-top-clean">
                  <span className="pill soft">
                    {isCurrent ? "Current Plan" : isLowerPlan ? "Included" : "Upgrade"}
                  </span>
                  <h3>{plan.name}</h3>
                  <div className="pricing-price-clean">{plan.priceLabel}</div>
                  <p>
                    {plan.monthlyMeetingLimit} uploads/month · {plan.userLimit} user
                    {plan.userLimit > 1 ? "s" : ""}
                  </p>
                </div>

                <ul className="pricing-list-clean">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <div className="pricing-action-clean">
                  {isCurrent ? (
                    <button className="btn secondary" type="button" disabled>
                      Active
                    </button>
                  ) : isLowerPlan ? (
                    <button className="btn secondary" type="button" disabled>
                      Included in {PLANS[currentPlan].name}
                    </button>
                  ) : isUpgrade ? (
                    <CheckoutButton plan={plan.id} />
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}