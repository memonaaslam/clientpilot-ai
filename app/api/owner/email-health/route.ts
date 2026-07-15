import { NextResponse } from "next/server";
import { Resend } from "resend";

import {
  OwnerAccessError,
  requireOwnerUser
} from "@/lib/owner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getErrorDetails(value: unknown) {
  const record =
    value &&
    typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    name: String(
      record.name || "ResendError"
    ),

    message: String(
      record.message ||
        "Resend returned an unknown error."
    ),

    statusCode:
      record.statusCode ?? null
  };
}

function createErrorResponse(error: unknown) {
  if (error instanceof OwnerAccessError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      {
        status: error.status
      }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to test support email."
    },
    {
      status: 500
    }
  );
}

export async function GET(request: Request) {
  try {
    const owner = await requireOwnerUser();

    const resendApiKey =
      process.env.RESEND_API_KEY?.trim() || "";

    const supportFrom =
      process.env.SUPPORT_EMAIL_FROM?.trim() ||
      "";

    const supportTo =
      process.env.SUPPORT_EMAIL_TO?.trim() ||
      "";

    const supportReplyTo =
      process.env
        .SUPPORT_EMAIL_REPLY_TO?.trim() ||
      "";

    const supportAppUrl =
      process.env.SUPPORT_APP_URL?.trim() ||
      "";

    const configuration = {
      RESEND_API_KEY:
        resendApiKey.length > 0,

      SUPPORT_EMAIL_FROM:
        supportFrom.length > 0,

      SUPPORT_EMAIL_TO:
        supportTo.length > 0,

      SUPPORT_EMAIL_REPLY_TO:
        supportReplyTo.length > 0,

      SUPPORT_APP_URL:
        supportAppUrl.length > 0
    };

    const shouldSend =
      new URL(request.url).searchParams.get(
        "send"
      ) === "1";

    if (!shouldSend) {
      return NextResponse.json({
        success: true,
        owner: owner.email,
        configuration
      });
    }

    const missingVariables =
      Object.entries(configuration)
        .filter(([, available]) => !available)
        .map(([name]) => name);

    if (missingVariables.length > 0) {
      return NextResponse.json(
        {
          success: false,
          configuration,
          missingVariables
        },
        {
          status: 500
        }
      );
    }

    const recipients = supportTo
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    const resend = new Resend(resendApiKey);

    const { data, error } =
      await resend.emails.send({
        from: supportFrom,
        to: recipients,
        replyTo:
          supportReplyTo || supportTo,
        subject:
          "ClientPilot AI Production Email Test",
        text: [
          "ClientPilot AI successfully reached the Resend email service.",
          "",
          `Owner: ${owner.email || "Makzora Owner"}`,
          `Time: ${new Date().toISOString()}`,
          `Application: ${supportAppUrl}`
        ].join("\n")
      });

    if (error) {
      console.error(
        "Owner email health test failed:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          configuration,
          resendError:
            getErrorDetails(error)
        },
        {
          status: 502
        }
      );
    }

    console.log(
      "Owner email health test succeeded:",
      data?.id
    );

    return NextResponse.json({
      success: true,
      configuration,
      emailId: data?.id || null,
      message:
        "Resend accepted the production test email."
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
