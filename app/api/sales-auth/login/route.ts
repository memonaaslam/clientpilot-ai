import { NextResponse } from "next/server";
import { createSalesSession, createSupabaseAdminClient, hashValue } from "@/lib/sales-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const staffId = String(body.staff_id || "").trim();
    const pin = String(body.pin || "").trim();

    if (!staffId || !pin) {
      return NextResponse.json(
        { error: "Staff ID and PIN are required." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: salesUser, error } = await supabase
      .from("sales_users")
      .select("*")
      .eq("staff_id", staffId)
      .eq("status", "active")
      .maybeSingle();

    if (error || !salesUser) {
      return NextResponse.json(
        { error: "Invalid Staff ID or inactive account." },
        { status: 401 }
      );
    }

    if (hashValue(pin) !== salesUser.pin_hash) {
      return NextResponse.json(
        { error: "Invalid PIN." },
        { status: 401 }
      );
    }

    await createSalesSession(String(salesUser.id), String(salesUser.owner_id));

    return NextResponse.json({
      success: true,
      redirectTo: "/clientpilotai/sales/dashboard"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to login.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
