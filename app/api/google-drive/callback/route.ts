import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  encryptRefreshToken,
  exchangeGoogleCode,
  getGoogleUser
} from "@/lib/google-drive";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

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

function settingsUrl(
  request: NextRequest,
  params: Record<string, string>
) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${request.nextUrl.origin}/clientpilotai`;

  const url = new URL(
    `${base}/dashboard/settings`
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
    const errorFromGoogle =
      request.nextUrl.searchParams.get("error");

    if (errorFromGoogle) {
      return NextResponse.redirect(
        settingsUrl(request, {
          drive_error: errorFromGoogle
        })
      );
    }

    const code =
      request.nextUrl.searchParams.get("code");

    const receivedState =
      request.nextUrl.searchParams.get("state");

    const storedState = request.cookies.get(
      "google_drive_oauth_state"
    )?.value;

    if (
      !code ||
      !receivedState ||
      !storedState ||
      receivedState !== storedState
    ) {
      return NextResponse.redirect(
        settingsUrl(request, {
          drive_error: "invalid_oauth_state"
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
        settingsUrl(request, {
          drive_error: "not_authenticated"
        })
      );
    }

    const tokens =
      await exchangeGoogleCode(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        settingsUrl(request, {
          drive_error:
            "google_refresh_token_missing"
        })
      );
    }

    const googleUser = await getGoogleUser(
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
      throw new Error(databaseError.message);
    }

    const response = NextResponse.redirect(
      settingsUrl(request, {
        drive_connected: "true"
      })
    );

    response.cookies.delete(
      "google_drive_oauth_state"
    );

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Google Drive connection failed.";

    return NextResponse.redirect(
      settingsUrl(request, {
        drive_error: message
      })
    );
  }
}