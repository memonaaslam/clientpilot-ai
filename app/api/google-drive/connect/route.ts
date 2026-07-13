import crypto from "crypto";
import { NextResponse } from "next/server";

import { createGoogleDriveAuthorizationUrl } from "@/lib/google-drive";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

function requireStateSecret(): string {
  const secret =
    process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error(
      "GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY is missing."
    );
  }

  return secret;
}

function createSignedState(userId: string): string {
  const payload = {
    userId,
    nonce: crypto.randomBytes(24).toString("hex"),
    expiresAt: Date.now() + 10 * 60 * 1000
  };

  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
    "utf8"
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", requireStateSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export async function GET() {
  try {
    const supabase =
      await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        "https://www.makzora.com/clientpilotai/login"
      );
    }

    const state = createSignedState(user.id);

    return NextResponse.redirect(
      createGoogleDriveAuthorizationUrl(state)
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to connect Google Drive.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}