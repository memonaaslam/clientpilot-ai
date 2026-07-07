import { NextResponse } from "next/server";
import { stripe, getStripePriceId } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const formData = await request.formData();
  const plan = String(formData.get("plan") || "starter");
  const price = getStripePriceId(plan);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl}/dashboard?payment=success`,
    cancel_url: `${appUrl}/#pricing`,
    client_reference_id: user.id,
    customer_email: user.email || undefined,
    metadata: { userId: user.id, plan }
  });

  return NextResponse.redirect(session.url!, { status: 303 });
}
