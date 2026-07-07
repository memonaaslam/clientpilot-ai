import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { normalizePlan, type PlanId } from "@/lib/plans";

export const runtime = "nodejs";

type LemonPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string;
    attributes?: Record<string, any>;
  };
};

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase admin credentials are missing.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false
    }
  });
}

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;

  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");

  const digestBuffer = Buffer.from(digest, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(digestBuffer, signatureBuffer);
}

function getPlanFromPayload(payload: LemonPayload): PlanId {
  const attrs = payload.data?.attributes || {};
  const customPlan = String(payload.meta?.custom_data?.plan || "").toLowerCase();

  if (customPlan) {
    return normalizePlan(customPlan);
  }

  const productText = [
    attrs.product_name,
    attrs.variant_name,
    attrs.name,
    attrs.product_id,
    attrs.variant_id
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (productText.includes("agency")) return "agency";
  if (productText.includes("pro")) return "pro";
  if (productText.includes("starter")) return "starter";

  return "free";
}

function getCustomerEmail(payload: LemonPayload) {
  const attrs = payload.data?.attributes || {};
  const customEmail = payload.meta?.custom_data?.email;

  return String(
    customEmail ||
      attrs.user_email ||
      attrs.customer_email ||
      attrs.email ||
      attrs.billing_email ||
      attrs.first_order_item?.user_email ||
      ""
  )
    .trim()
    .toLowerCase();
}

function getCleanValue(value: unknown) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function getPeriodEnd(attrs: Record<string, any>) {
  return (
    getCleanValue(attrs.renews_at) ||
    getCleanValue(attrs.ends_at) ||
    getCleanValue(attrs.trial_ends_at) ||
    null
  );
}

function shouldSetFreePlan(eventName: string, status: string) {
  const inactiveEvents = [
    "subscription_cancelled",
    "subscription_expired",
    "subscription_paused"
  ];

  const inactiveStatuses = [
    "cancelled",
    "expired",
    "paused",
    "unpaid",
    "past_due"
  ];

  return inactiveEvents.includes(eventName) || inactiveStatuses.includes(status);
}

async function findUserIdByEmail(email: string) {
  const admin = createSupabaseAdmin();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000
    });

    if (error) {
      throw error;
    }

    const foundUser = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (foundUser) {
      return foundUser.id;
    }

    if (data.users.length < 1000) {
      break;
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json(
        { error: "LEMON_SQUEEZY_WEBHOOK_SECRET is missing." },
        { status: 500 }
      );
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-signature");

    const isValid = verifySignature(rawBody, signature, secret);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid Lemon Squeezy signature." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as LemonPayload;
    const eventName = String(payload.meta?.event_name || "");
    const attrs = payload.data?.attributes || {};

    const customerEmail = getCustomerEmail(payload);
    const customUserId = String(payload.meta?.custom_data?.user_id || "").trim();

    const userId = customUserId || (customerEmail ? await findUserIdByEmail(customerEmail) : null);

    if (!userId) {
      return NextResponse.json({
        received: true,
        warning: "No matching Supabase user found for Lemon Squeezy customer email.",
        customerEmail
      });
    }

    const rawStatus = String(attrs.status || "active").toLowerCase();
    const detectedPlan = getPlanFromPayload(payload);

    const finalPlan = shouldSetFreePlan(eventName, rawStatus) ? "free" : detectedPlan;
    const finalStatus = shouldSetFreePlan(eventName, rawStatus) ? rawStatus || "inactive" : rawStatus || "active";

    const admin = createSupabaseAdmin();

    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: finalPlan,
        status: finalStatus,
        lemon_customer_id: getCleanValue(attrs.customer_id),
        lemon_subscription_id: getCleanValue(payload.data?.id || attrs.subscription_id),
        lemon_order_id: getCleanValue(attrs.order_id),
        lemon_product_id: getCleanValue(attrs.product_id),
        lemon_variant_id: getCleanValue(attrs.variant_id),
        current_period_start: getCleanValue(attrs.created_at),
        current_period_end: getPeriodEnd(attrs),
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

    return NextResponse.json({
      received: true,
      eventName,
      userId,
      plan: finalPlan,
      status: finalStatus
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lemon Squeezy webhook failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}