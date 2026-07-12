import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
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
    attributes?: Record<string, unknown>;
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
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string
) {
  if (!signature) return false;

  const expectedSignature = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function getTextValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function getNullableValue(value: unknown): string | null {
  const cleaned = getTextValue(value);
  return cleaned || null;
}

function getPlanFromPayload(payload: LemonPayload): PlanId {
  const attributes = payload.data?.attributes ?? {};

  const customPlan = getTextValue(
    payload.meta?.custom_data?.plan
  ).toLowerCase();

  if (customPlan) {
    return normalizePlan(customPlan);
  }

  const productText = [
    attributes.product_name,
    attributes.variant_name,
    attributes.name
  ]
    .map(getTextValue)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (productText.includes("agency")) return "agency";
  if (productText.includes("starter")) return "starter";
  if (productText.includes("pro")) return "pro";

  return "free";
}

function getCustomerEmail(payload: LemonPayload): string {
  const attributes = payload.data?.attributes ?? {};

  const values = [
    payload.meta?.custom_data?.email,
    attributes.user_email,
    attributes.customer_email,
    attributes.email,
    attributes.billing_email
  ];

  const email = values
    .map(getTextValue)
    .find(Boolean);

  return (email ?? "").toLowerCase();
}

function getCurrentPeriodEnd(
  attributes: Record<string, unknown>
): string | null {
  return (
    getNullableValue(attributes.renews_at) ||
    getNullableValue(attributes.ends_at) ||
    getNullableValue(attributes.trial_ends_at)
  );
}

function subscriptionHasEnded(
  eventName: string,
  status: string,
  endsAt: string | null
): boolean {
  if (eventName === "subscription_expired") {
    return true;
  }

  if (status === "expired") {
    return true;
  }

  if (status === "cancelled" && endsAt) {
    const endDate = new Date(endsAt);

    if (
      !Number.isNaN(endDate.getTime()) &&
      endDate.getTime() <= Date.now()
    ) {
      return true;
    }
  }

  return false;
}

async function findUserIdByEmail(email: string) {
  const admin = createSupabaseAdmin();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } =
      await admin.auth.admin.listUsers({
        page,
        perPage: 1000
      });

    if (error) {
      throw error;
    }

    const foundUser = data.users.find(
      (user) =>
        user.email?.toLowerCase() === email.toLowerCase()
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
    const secret =
      process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json(
        {
          error:
            "LEMON_SQUEEZY_WEBHOOK_SECRET is missing."
        },
        { status: 500 }
      );
    }

    const rawBody = await request.text();
    const signature =
      request.headers.get("x-signature");

    if (
      !verifySignature(rawBody, signature, secret)
    ) {
      return NextResponse.json(
        {
          error: "Invalid Lemon Squeezy signature."
        },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody) as LemonPayload;

    const eventName = getTextValue(
      payload.meta?.event_name
    );

    const attributes =
      payload.data?.attributes ?? {};

    const customerEmail =
      getCustomerEmail(payload);

    const customUserId = getTextValue(
      payload.meta?.custom_data?.user_id
    );

    const userId =
      customUserId ||
      (customerEmail
        ? await findUserIdByEmail(customerEmail)
        : null);

    if (!userId) {
      return NextResponse.json({
        received: true,
        warning:
          "No matching Supabase user was found.",
        customerEmail
      });
    }

    const detectedPlan =
      getPlanFromPayload(payload);

    const status =
      getTextValue(attributes.status)
        .toLowerCase() || "active";

    const endsAt =
      getNullableValue(attributes.ends_at);

    const hasEnded = subscriptionHasEnded(
      eventName,
      status,
      endsAt
    );

    /*
      A cancelled subscription remains on its paid plan
      until ends_at. It becomes Free only after expiration.
    */
    const finalPlan: PlanId = hasEnded
      ? "free"
      : detectedPlan;

    const admin = createSupabaseAdmin();

    const { error: upsertError } = await admin
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan: finalPlan,
          status,
          lemon_customer_id: getNullableValue(
            attributes.customer_id
          ),
          lemon_subscription_id: getNullableValue(
            payload.data?.id ||
              attributes.subscription_id
          ),
          lemon_order_id: getNullableValue(
            attributes.order_id
          ),
          lemon_product_id: getNullableValue(
            attributes.product_id
          ),
          lemon_variant_id: getNullableValue(
            attributes.variant_id
          ),
          current_period_start: getNullableValue(
            attributes.created_at
          ),
          current_period_end:
            getCurrentPeriodEnd(attributes),
          updated_at: new Date().toISOString()
        },
        {
          onConflict: "user_id"
        }
      );

    if (upsertError) {
      throw new Error(
        `Subscription update failed: ${upsertError.message}`
      );
    }

    return NextResponse.json({
      received: true,
      eventName,
      userId,
      plan: finalPlan,
      status,
      accessEndsAt: endsAt
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Lemon Squeezy webhook failed.";

    console.error(
      "Lemon Squeezy webhook error:",
      error
    );

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}