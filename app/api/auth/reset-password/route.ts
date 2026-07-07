import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getMessage(error: unknown) {
  if (!error) return "Unable to send password reset email.";

  if (typeof error === "string") {
    return error === "{}" ? "Unable to send password reset email. Please check SMTP settings." : error;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message?: unknown }).message || "").trim();

    if (!message || message === "{}" || message === "[object Object]") {
      return "Unable to send password reset email. Please check SMTP settings.";
    }

    return message;
  }

  return "Unable to send password reset email. Please check SMTP settings.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim();

    if (!email) {
      return NextResponse.json({ error: "Please enter your email first." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase environment variables are missing." },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`
    });

    if (error) {
      return NextResponse.json({ error: getMessage(error) }, { status: 400 });
    }

    return NextResponse.json({
      message: "Password reset email sent. Please check your inbox or spam folder."
    });
  } catch (error) {
    return NextResponse.json({ error: getMessage(error) }, { status: 500 });
  }
}