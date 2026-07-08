import { createHash, randomInt } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserSubscription } from "@/lib/subscription";

export const runtime = "nodejs";

function generateStaffId() {
  return `CP-${randomInt(100000, 999999)}`;
}

function generatePin() {
  return String(randomInt(1000, 9999));
}

function hashPin(pin: string) {
  return createHash("sha256").update(pin).digest("hex");
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please login first." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("sales_users")
      .select("id,staff_id,name,email,phone,role,status,created_at,updated_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ salesUsers: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load sales users.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please login first." }, { status: 401 });
    }

    const subscription = await getUserSubscription(user.id);

    if (subscription.plan !== "agency") {
      return NextResponse.json(
        { error: "Sales team users are available on the Agency plan only." },
        { status: 403 }
      );
    }

    const existing = await supabase
      .from("sales_users")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "active");

    if ((existing.count || 0) >= 3) {
      return NextResponse.json(
        {
          error:
            "Agency plan includes 3 active sales users. Use the custom team add-on for more seats."
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "Sales person name is required." }, { status: 400 });
    }

    const pin = generatePin();

    let staffId = generateStaffId();

    for (let attempt = 0; attempt < 5; attempt++) {
      const check = await supabase
        .from("sales_users")
        .select("id")
        .eq("staff_id", staffId)
        .maybeSingle();

      if (!check.data) break;

      staffId = generateStaffId();
    }

    const payload = {
      owner_id: user.id,
      staff_id: staffId,
      name: String(body.name),
      email: body.email ? String(body.email) : null,
      phone: body.phone ? String(body.phone) : null,
      pin_hash: hashPin(pin),
      role: "sales",
      status: "active",
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("sales_users")
      .insert(payload)
      .select("id,staff_id,name,email,phone,role,status,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      salesUser: data,
      temporaryPin: pin,
      important:
        "Show this PIN to the sales person now. For security, it will not be shown again."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create sales user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}