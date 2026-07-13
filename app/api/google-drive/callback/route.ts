import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  encryptRefreshToken,
  exchangeGoogleCode,
  getGoogleUser
} from "@/lib/google-drive";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type OAuthStatePayload = {
  userId: string;
  nonce: string;
  expiresAt: number;
};

function createSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

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

function safeEqual(
  expected: string,
  received: string
): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
}

function verifySignedState(
  state: string
): OAuthStatePayload | null {
  try {
    const [encodedPayload, receivedSignature] =
      state.split(".");

    if (
      !encodedPayload ||
      !receivedSignature
    ) {
      return null;
    }

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        requireStateSecret()
      )
      .update(encodedPayload)
      .digest("base64url");

    if (
      !safeEqual(
        expectedSignature,
        receivedSignature
      )
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(
        encodedPayload,
        "base64url"
      ).toString("utf8")
    ) as OAuthStatePayload;

    if (
      !payload.userId ||
      !payload.nonce ||
      !payload.expiresAt
    ) {
      return null;
    }

    if (payload.expiresAt < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function settingsUrl(
  params: Record<string, string>
) {
  const url = new URL(
    "https://www.makzora.com/clientpilotai/dashboard/settings"
  );

  for (const [key, value] of Object.entries(
    params
  )) {
    url.searchParams.set(key, value);
  }

  return url;
}

export async function GET(
  request: NextRequest
) {
  try {
    const googleError =
      request.nextUrl.searchParams.get("error");

    if (googleError) {
      return NextResponse.redirect(
        settingsUrl({
          drive_error: googleError
        })
      );
    }

    const code =
      request.nextUrl.searchParams.get("code");

    const state =
      request.nextUrl.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(
        settingsUrl({
          drive_error:
            "missing_oauth_parameters"
        })
      );
    }

    const statePayload =
      verifySignedState(state);

    if (!statePayload) {
      return NextResponse.redirect(
        settingsUrl({
          drive_error:
            "invalid_oauth_state"
        })
      );
    }

    const supabase =
      await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        settingsUrl({
          drive_error:
            "not_authenticated"
        })
      );
    }

    if (user.id !== statePayload.userId) {
      return NextResponse.redirect(
        settingsUrl({
          drive_error:
            "oauth_user_mismatch"
        })
      );
    }

    const tokens =
      await exchangeGoogleCode(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        settingsUrl({
          drive_error:
            "google_refresh_token_missing"
        })
      );
    }

    const googleUser =
      await getGoogleUser(
        tokens.access_token
      );

    const admin = createSupabaseAdmin();

    const { error: databaseError } =
      await admin
        .from("google_drive_connections")
        .upsert(
          {
            user_id: user.id,
            google_email:
              googleUser.email || null,

            encrypted_refresh_token:
              encryptRefreshToken(
                tokens.refresh_token
              ),

            access_token_expires_at:
              new Date(
                Date.now() +
                  tokens.expires_in * 1000
              ).toISOString(),

            is_active: true,

            connected_at:
              new Date().toISOString(),

            updated_at:
              new Date().toISOString()
          },
          {
            onConflict: "user_id"
          }
        );

    if (databaseError) {
      throw new Error(
        databaseError.message
      );
    }

    return NextResponse.redirect(
      settingsUrl({
        drive_connected: "true"
      })
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Google Drive connection failed.";

    return NextResponse.redirect(
      settingsUrl({
        drive_error: message
      })
    );
  }
}