import { getStripe, getStripePriceId } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const plan = body.plan || "starter";

    const priceId = getStripePriceId(plan);

    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price ID is missing. Add Stripe price IDs in Vercel environment variables." },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/?payment=cancelled`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Stripe checkout failed."
      },
      { status: 500 }
    );
  }
}