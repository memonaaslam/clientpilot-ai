import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { getStripePriceId, normalizePlan, PLANS } from "@/lib/plans";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please login first." }, { status: 401 });
    }

    const body = await request.json();
    const plan = normalizePlan(body.plan);

    if (plan === "free") {
      return NextResponse.json({ error: "Free plan does not need checkout." }, { status: 400 });
    }

    const priceId = getStripePriceId(plan);

    if (!priceId) {
      return NextResponse.json(
        {
          error: `Stripe price ID is missing for ${PLANS[plan].name}. Add it in Vercel environment variables.`
        },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const stripe = getStripe();

    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: existingSubscription?.stripe_customer_id || undefined,
      customer_email: existingSubscription?.stripe_customer_id ? undefined : user.email || undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${appUrl}/dashboard/subscription?success=true`,
      cancel_url: `${appUrl}/dashboard/subscription?cancelled=true`,
      metadata: {
        user_id: user.id,
        plan
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan
        }
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create checkout session.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}