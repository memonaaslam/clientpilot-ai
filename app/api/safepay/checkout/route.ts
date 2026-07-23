import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { Safepay } from "@sfpy/node-sdk";

import type { PlanId } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaidPlan = Exclude<PlanId, "free">;

const PLAN_ENV_KEYS: Record<PaidPlan, string> = {
  starter: "SAFEPAY_STARTER_PLAN_ID",
  pro: "SAFEPAY_PRO_PLAN_ID",
  agency: "SAFEPAY_AGENCY_PLAN_ID"
};

function isPaidPlan(value: unknown): value is PaidPlan {
  return (
    value === "starter" ||
    value === "pro" ||
    value === "agency"
  );
}

function getRequiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export async function POST(request: Request) {
  try {
    const supabase =
      await createSupabaseServerClient();

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Please log in before subscribing."
        },
        {
          status: 401
        }
      );
    }

    const body = (await request.json()) as {
      plan?: unknown;
    };

    if (!isPaidPlan(body.plan)) {
      return NextResponse.json(
        {
          error: "Please select a valid paid plan."
        },
        {
          status: 400
        }
      );
    }

    const plan = body.plan;
    const planId = getRequiredEnvironmentVariable(
      PLAN_ENV_KEYS[plan]
    );

    const safepay = new Safepay({
      environment: "sandbox" as ConstructorParameters<typeof Safepay>[0]["environment"],
      apiKey: getRequiredEnvironmentVariable(
        "NEXT_PUBLIC_SAFEPAY_PUBLIC_KEY"
      ),
      v1Secret: getRequiredEnvironmentVariable(
        "SAFEPAY_SECRET_KEY"
      ),
      webhookSecret: getRequiredEnvironmentVariable(
        "SAFEPAY_WEBHOOK_SECRET"
      )
    });

    const origin = new URL(request.url).origin;

    const reference = [
      "clientpilot",
      user.id,
      plan,
      randomUUID()
    ].join(":");

    const checkoutUrl =
      await safepay.checkout.createSubscription({
        planId,
        reference,
        cancelUrl:
          `${origin}/clientpilotai/dashboard/subscription?payment=cancelled`,
        redirectUrl:
          `${origin}/clientpilotai/dashboard/subscription?payment=success`
      });

    if (
      typeof checkoutUrl !== "string" ||
      !checkoutUrl.startsWith("https://")
    ) {
      throw new Error(
        "Safepay did not return a valid checkout URL."
      );
    }

    return NextResponse.json({
      url: checkoutUrl
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create Safepay checkout.";

    console.error("Safepay checkout error:", error);

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





