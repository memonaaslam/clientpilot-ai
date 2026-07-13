import crypto from "crypto";
import { NextResponse } from "next/server";

import { createGoogleDriveAuthorizationUrl } from "@/lib/google-drive";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase =
      await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL(
          "/clientpilotai/login",
          process.env.NEXT_PUBLIC_APP_URL ||
            "https://www.makzora.com"
        )
      );
    }

    const state = crypto.randomBytes(32).toString(
      "hex"
    );

    const response = NextResponse.redirect(
      createGoogleDriveAuthorizationUrl(state)
    );

    response.cookies.set(
      "google_drive_oauth_state",
      state,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/"
      }
    );

    return response;
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