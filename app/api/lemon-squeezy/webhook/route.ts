import {
  createHash,
  createHmac,
  timingSafeEqual
} from "crypto";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  normalizePlan,
  type PlanId
} from "@/lib/plans";

import {
  getPlanFromLemonVariantId
} from "@/lib/lemon-plan-map";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LemonPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };

  data?: {
    type?: string;
    id?: string;
    attributes?: Record<string, unknown>;
  };
};

type ExistingSubscription = {
  plan: string | null;
  status: string | null;
  lemon_customer_id: string | null;
  lemon_subscription_id: string | null;
  lemon_order_id: string | null;
  lemon_product_id: string | null;
  lemon_variant_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
};

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase admin credentials are missing."
    );
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
  if (!signature) {
    return false;
  }

  const expectedSignature = createHmac(
    "sha256",
    secret
  )
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(
    expectedSignature,
    "utf8"
  );

  const receivedBuffer = Buffer.from(
    signature,
    "utf8"
  );

  if (
    expectedBuffer.length !== receivedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
}

function getTextValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function getNullableValue(
  value: unknown
): string | null {
  const text = getTextValue(value);

  return text || null;
}

function getRecord(
  value: unknown
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getMinorAmount(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount);
}

function getOptionalPlanFromPayload(
  payload: LemonPayload
): PlanId | null {
  const attributes =
    payload.data?.attributes ?? {};

  const firstOrderItem = getRecord(
    attributes.first_order_item
  );

  const variantId =
    getTextValue(
      attributes.variant_id
    ) ||
    getTextValue(
      firstOrderItem.variant_id
    );

  const variantPlan =
    getPlanFromLemonVariantId(
      variantId
    );

  const customPlan = getTextValue(
    payload.meta?.custom_data?.plan
  ).toLowerCase();

  /*
    Custom checkout data is useful for identifying
    the local user, but it is not trusted for paid
    plan entitlements. The signed Lemon variant ID
    is the primary source of truth.
  */
  if (variantPlan) {
    if (
      customPlan &&
      customPlan !== variantPlan
    ) {
      console.warn(
        "Ignored Lemon custom plan mismatch.",
        {
          variantId,
          variantPlan,
          customPlan
        }
      );
    }

    return variantPlan;
  }

  /*
    Some invoice-style events can omit variant_id.
    Product and variant names are part of the signed
    Lemon webhook payload, so they are a safe
    compatibility fallback. Payment events later
    preserve the existing subscription plan.
  */
  const productText = [
    attributes.product_name,
    attributes.variant_name,
    attributes.name,
    firstOrderItem.product_name,
    firstOrderItem.variant_name
  ]
    .map(getTextValue)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    productText.includes("agency")
  ) {
    return "agency";
  }

  if (
    /\bpro\b/.test(productText)
  ) {
    return "pro";
  }

  if (
    productText.includes("starter")
  ) {
    return "starter";
  }

  return null;
}

function getPlanFromPayload(
  payload: LemonPayload
): PlanId {
  return (
    getOptionalPlanFromPayload(payload) ||
    "free"
  );
}

function getCustomerEmail(
  payload: LemonPayload
): string {
  const attributes =
    payload.data?.attributes ?? {};

  const possibleEmails = [
    payload.meta?.custom_data?.email,
    attributes.user_email,
    attributes.customer_email,
    attributes.email,
    attributes.billing_email
  ];

  const email = possibleEmails
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
    getNullableValue(
      attributes.trial_ends_at
    )
  );
}

function subscriptionHasEnded(
  eventName: string,
  status: string,
  endsAt: string | null
): boolean {
  if (
    eventName === "subscription_expired" ||
    status === "expired"
  ) {
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

function isPaymentEvent(
  eventName: string
): boolean {
  return [
    "subscription_payment_success",
    "subscription_payment_failed",
    "subscription_payment_recovered",
    "subscription_payment_refunded"
  ].includes(eventName);
}

function isRefundEvent(
  eventName: string
): boolean {
  return [
    "order_refunded",
    "subscription_payment_refunded"
  ].includes(eventName);
}

function getFinalStatus(
  eventName: string,
  payloadStatus: string,
  existingStatus: string | null
): string {
  if (
    eventName ===
      "subscription_payment_success" ||
    eventName ===
      "subscription_payment_recovered"
  ) {
    return "active";
  }

  if (
    eventName ===
    "subscription_payment_failed"
  ) {
    return "past_due";
  }

  /*
    Refunding an invoice does not necessarily
    cancel or expire the subscription itself.
  */
  if (isRefundEvent(eventName)) {
    return existingStatus || "active";
  }

  return (
    payloadStatus ||
    existingStatus ||
    "active"
  );
}

function getSubscriptionId(
  payload: LemonPayload,
  attributes: Record<string, unknown>,
  existing: ExistingSubscription | null
) {
  const explicitSubscriptionId =
    getNullableValue(
      attributes.subscription_id
    );

  if (explicitSubscriptionId) {
    return explicitSubscriptionId;
  }

  if (
    getTextValue(payload.data?.type) ===
    "subscriptions"
  ) {
    return (
      getNullableValue(payload.data?.id) ||
      existing?.lemon_subscription_id ||
      null
    );
  }

  return (
    existing?.lemon_subscription_id || null
  );
}

function getOrderId(
  payload: LemonPayload,
  attributes: Record<string, unknown>,
  existing: ExistingSubscription | null
) {
  const explicitOrderId =
    getNullableValue(attributes.order_id);

  if (explicitOrderId) {
    return explicitOrderId;
  }

  if (
    getTextValue(payload.data?.type) ===
    "orders"
  ) {
    return (
      getNullableValue(payload.data?.id) ||
      existing?.lemon_order_id ||
      null
    );
  }

  return existing?.lemon_order_id || null;
}

function getProductId(
  attributes: Record<string, unknown>,
  existing: ExistingSubscription | null
) {
  const firstOrderItem = getRecord(
    attributes.first_order_item
  );

  return (
    getNullableValue(attributes.product_id) ||
    getNullableValue(
      firstOrderItem.product_id
    ) ||
    existing?.lemon_product_id ||
    null
  );
}

function getVariantId(
  attributes: Record<string, unknown>,
  existing: ExistingSubscription | null
) {
  const firstOrderItem = getRecord(
    attributes.first_order_item
  );

  return (
    getNullableValue(attributes.variant_id) ||
    getNullableValue(
      firstOrderItem.variant_id
    ) ||
    existing?.lemon_variant_id ||
    null
  );
}

function getCustomerId(
  attributes: Record<string, unknown>,
  existing: ExistingSubscription | null
) {
  return (
    getNullableValue(attributes.customer_id) ||
    existing?.lemon_customer_id ||
    null
  );
}

function getOccurredAt(
  eventName: string,
  attributes: Record<string, unknown>
) {
  if (isRefundEvent(eventName)) {
    const refundedAt = getNullableValue(
      attributes.refunded_at
    );

    if (refundedAt) {
      return refundedAt;
    }
  }

  return (
    getNullableValue(attributes.updated_at) ||
    getNullableValue(attributes.created_at) ||
    new Date().toISOString()
  );
}

function getEventKey(rawBody: string) {
  const hash = createHash("sha256")
    .update(rawBody)
    .digest("hex");

  return `lemon:${hash}`;
}

function getLedgerAmounts(
  eventName: string,
  attributes: Record<string, unknown>
) {
  /*
    Lemon Squeezy sends order_created,
    subscription_created and
    subscription_payment_success during the
    initial subscription purchase.

    Revenue is stored only on
    subscription_payment_success to prevent
    duplicate or triple counting.
  */
  const isSuccessfulSubscriptionPayment =
    eventName ===
    "subscription_payment_success";

  const grossAmountMinor =
    isSuccessfulSubscriptionPayment
      ? getMinorAmount(attributes.total)
      : 0;

  const taxAmountMinor =
    isSuccessfulSubscriptionPayment
      ? getMinorAmount(attributes.tax)
      : 0;

  const refundedAmountMinor = isRefundEvent(
    eventName
  )
    ? getMinorAmount(
        attributes.refunded_amount
      )
    : 0;

  /*
    Lemon Squeezy's order and subscription
    invoice webhook objects do not contain the
    merchant payout fee, so the fee remains zero
    until a separate payout/fee import is added.
  */
  const feeAmountMinor = 0;

  return {
    grossAmountMinor,
    refundedAmountMinor,
    taxAmountMinor,
    feeAmountMinor
  };
}

async function findUserIdByEmail(
  email: string
) {
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
        user.email?.toLowerCase() ===
        email.toLowerCase()
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

export async function POST(
  request: Request
) {
  try {
    const secret =
      process.env
        .LEMON_SQUEEZY_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json(
        {
          error:
            "LEMON_SQUEEZY_WEBHOOK_SECRET is missing."
        },
        {
          status: 500
        }
      );
    }

    const rawBody = await request.text();

    const signature =
      request.headers.get("x-signature");

    if (
      !verifySignature(
        rawBody,
        signature,
        secret
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid Lemon Squeezy signature."
        },
        {
          status: 401
        }
      );
    }

    const payload = JSON.parse(
      rawBody
    ) as LemonPayload;

    const attributes =
      payload.data?.attributes ?? {};

    const eventName =
      getTextValue(
        payload.meta?.event_name
      ) ||
      getTextValue(
        request.headers.get("x-event-name")
      );

    if (!eventName) {
      return NextResponse.json(
        {
          error:
            "Lemon Squeezy event name is missing."
        },
        {
          status: 400
        }
      );
    }

    const customerEmail =
      getCustomerEmail(payload);

    const customUserId = getTextValue(
      payload.meta?.custom_data?.user_id
    );

    const userId =
      customUserId ||
      (customerEmail
        ? await findUserIdByEmail(
            customerEmail
          )
        : null);

    const admin = createSupabaseAdmin();

    let existing:
      | ExistingSubscription
      | null = null;

    if (userId) {
      const {
        data: existingData,
        error: existingError
      } = await admin
        .from("subscriptions")
        .select(
          [
            "plan",
            "status",
            "lemon_customer_id",
            "lemon_subscription_id",
            "lemon_order_id",
            "lemon_product_id",
            "lemon_variant_id",
            "current_period_start",
            "current_period_end"
          ].join(",")
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (existingError) {
        throw new Error(
          `Unable to read existing subscription: ${existingError.message}`
        );
      }

      existing =
        (existingData ??
          null) as unknown as
          | ExistingSubscription
          | null;
    }

    const payloadStatus = getTextValue(
      attributes.status
    ).toLowerCase();

    const endsAt = getNullableValue(
      attributes.ends_at
    );

    const optionalDetectedPlan =
      getOptionalPlanFromPayload(payload);

    const detectedPlan =
      getPlanFromPayload(payload);

    const hasEnded =
      subscriptionHasEnded(
        eventName,
        payloadStatus,
        endsAt
      );

    let finalPlan: PlanId;

    if (hasEnded) {
      finalPlan = "free";
    } else if (
      isPaymentEvent(eventName)
    ) {
      /*
        Subscription invoice events may not
        include product or variant names.
        Preserve the existing subscription plan.
      */
      finalPlan = normalizePlan(
        existing?.plan ||
          optionalDetectedPlan ||
          detectedPlan
      );
    } else {
      finalPlan = detectedPlan;
    }

    const finalStatus = getFinalStatus(
      eventName,
      payloadStatus,
      existing?.status ?? null
    );

    const subscriptionId =
      getSubscriptionId(
        payload,
        attributes,
        existing
      );

    const orderId = getOrderId(
      payload,
      attributes,
      existing
    );

    const productId = getProductId(
      attributes,
      existing
    );

    const variantId = getVariantId(
      attributes,
      existing
    );

    const customerId = getCustomerId(
      attributes,
      existing
    );

    const ledgerPlan: PlanId | null =
      optionalDetectedPlan ||
      (existing?.plan
        ? normalizePlan(existing.plan)
        : null);

    const currency =
      getTextValue(attributes.currency)
        .toUpperCase() || "USD";

    const {
      grossAmountMinor,
      refundedAmountMinor,
      taxAmountMinor,
      feeAmountMinor
    } = getLedgerAmounts(
      eventName,
      attributes
    );

    const eventKey =
      getEventKey(rawBody);

    const occurredAt = getOccurredAt(
      eventName,
      attributes
    );

    const {
      error: ledgerError
    } = await admin
      .from("owner_payment_events")
      .upsert(
        {
          event_key: eventKey,
          provider: "lemon_squeezy",
          event_name: eventName,

          user_id: userId || null,
          customer_email:
            customerEmail || null,

          plan: ledgerPlan,
          subscription_status:
            finalStatus || null,

          currency,

          gross_amount_minor:
            grossAmountMinor,

          refunded_amount_minor:
            refundedAmountMinor,

          tax_amount_minor:
            taxAmountMinor,

          fee_amount_minor:
            feeAmountMinor,

          lemon_customer_id:
            customerId,

          lemon_subscription_id:
            subscriptionId,

          lemon_order_id: orderId,
          lemon_product_id: productId,
          lemon_variant_id: variantId,

          occurred_at: occurredAt,
          raw_payload: payload
        },
        {
          onConflict: "event_key"
        }
      );

    if (ledgerError) {
      throw new Error(
        `Owner payment ledger update failed: ${ledgerError.message}`
      );
    }

    /*
      Save financial events even if a checkout
      cannot be matched to a Supabase account.
      This prevents Owner Dashboard revenue from
      disappearing because of an email mismatch.
    */
    if (!userId) {
      return NextResponse.json({
        received: true,
        eventName,
        paymentEventSaved: true,
        warning:
          "Payment event saved, but no matching Supabase user was found.",
        customerEmail
      });
    }

    const {
      error: upsertError
    } = await admin
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan: finalPlan,
          status: finalStatus,

          lemon_customer_id:
            customerId,

          lemon_subscription_id:
            subscriptionId,

          lemon_order_id: orderId,

          lemon_product_id:
            productId,

          lemon_variant_id:
            variantId,

          current_period_start:
            getNullableValue(
              attributes.created_at
            ) ||
            existing?.current_period_start ||
            null,

          current_period_end:
            getCurrentPeriodEnd(
              attributes
            ) ||
            existing?.current_period_end ||
            null,

          updated_at:
            new Date().toISOString()
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
      status: finalStatus,
      paymentEventSaved: true,
      grossAmountMinor,
      refundedAmountMinor,
      currency,
      preservedExistingPlan:
        isPaymentEvent(eventName)
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
      {
        error: message
      },
      {
        status: 500
      }
    );
  }
}

