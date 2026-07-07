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
        <div className="card">
          <p>Please login first from /login.</p>
        </div>
      </DashboardShell>
    );
  }

  const limitStatus = await getPlanLimitStatus(user.id);
  const currentPlan = limitStatus.subscription.plan;
  const currentRank = PLAN_RANK[currentPlan];

  const planOrder: PlanId[] = ["free", "starter", "pro", "agency"];

  return (
    <DashboardShell>
      <div className="page-hero">
        <div>
          <span className="badge">Subscription</span>
          <h1 style={{ fontSize: 46 }}>Plans & Usage</h1>
          <p className="muted">
            Manage your ClientPilot AI subscription and monthly meeting upload limits.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>{limitStatus.usage}/{limitStatus.limit}</strong>
          <span>Meetings this month</span>
        </div>
      </div>

      <div className="card">
        <h3>Current Plan</h3>
        <p className="muted">
          You are currently on <strong>{PLANS[currentPlan].name}</strong>. You have{" "}
          <strong>{limitStatus.remaining}</strong> meeting uploads remaining this month.
        </p>
      </div>

      <div className="grid three">
        {planOrder.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = currentPlan === planId;
          const isLowerPlan = PLAN_RANK[planId] < currentRank;
          const isUpgrade = PLAN_RANK[planId] > currentRank;

          return (
            <div className={isCurrent ? "card plan-card active-plan" : "card plan-card"} key={plan.id}>
              <span className="pill soft">
                {isCurrent ? "Current Plan" : isLowerPlan ? "Included" : "Upgrade Option"}
              </span>

              <h3>{plan.name}</h3>
              <h2>{plan.priceLabel}</h2>

              <p className="muted">
                {plan.monthlyMeetingLimit} meeting uploads/month · {plan.userLimit} user
                {plan.userLimit > 1 ? "s" : ""}
              </p>

              <ul className="plan-list">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

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
          );
        })}
      </div>
    </DashboardShell>
  );
}