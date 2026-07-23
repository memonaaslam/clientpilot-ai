import { NextResponse } from "next/server";
import { Safepay } from "@sfpy/node-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SafepayWebhookBody = {
  type?: unknown;
  event?: unknown;
  data?: unknown;
};

function getRequiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SafepayWebhookBody;

    const signature =
      request.headers.get("x-sfpy-signature");

    if (!signature) {
      return NextResponse.json(
        {
          error: "Missing Safepay signature."
        },
        {
          status: 401
        }
      );
    }

    const safepay = new Safepay({
      environment:
        "sandbox" as ConstructorParameters<
          typeof Safepay
        >[0]["environment"],

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

    const isValid = safepay.verify.webhook({
      body,
      headers: {
        "x-sfpy-signature": signature
      }
    });

    if (!isValid) {
      console.error(
        "Safepay webhook signature verification failed."
      );

      return NextResponse.json(
        {
          error: "Invalid Safepay signature."
        },
        {
          status: 401
        }
      );
    }

    console.log(
      "Verified Safepay webhook:",
      JSON.stringify(
        {
          type: body.type ?? null,
          event: body.event ?? null,
          data: body.data ?? null
        },
        null,
        2
      )
    );

    return NextResponse.json({
      received: true,
      verified: true
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Safepay webhook failed.";

    console.error(
      "Safepay webhook error:",
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
