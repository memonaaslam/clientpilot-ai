import { createHash, randomInt } from "crypto";
import { NextResponse } from "next/server";

import { getPlanConfig } from "@/lib/plans";
import { getUserSubscription } from "@/lib/subscription";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
      return NextResponse.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("sales_users")
      .select(
        "id,staff_id,name,email,phone,role,status,created_at,updated_at"
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      salesUsers: data || []
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load sales users.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

    const subscription = await getUserSubscription(user.id);
    const planConfig = getPlanConfig(subscription.plan);
    const salesUserLimit = planConfig.includedSalesUsers;

    if (salesUserLimit <= 0) {
      return NextResponse.json(
        {
          error:
            "Your current plan does not include sales users. Upgrade to Starter, Pro, or Agency."
        },
        { status: 403 }
      );
    }

    const {
      count,
      error: countError
    } = await supabase
      .from("sales_users")
      .select("id", {
        count: "exact",
        head: true
      })
      .eq("owner_id", user.id)
      .eq("status", "active");

    if (countError) {
      return NextResponse.json(
        {
          error:
            "Unable to check your current sales user usage."
        },
        { status: 500 }
      );
    }

    const activeSalesUsers = count || 0;

    if (activeSalesUsers >= salesUserLimit) {
      return NextResponse.json(
        {
          error: `${planConfig.name} allows ${salesUserLimit} active sales user${
            salesUserLimit === 1 ? "" : "s"
          }.`,
          code: "SALES_USER_LIMIT_REACHED",
          plan: subscription.plan,
          used: activeSalesUsers,
          limit: salesUserLimit,
          remaining: 0
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim()
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          error: "Sales person name is required."
        },
        { status: 400 }
      );
    }

    const pin = generatePin();
    let staffId = generateStaffId();
    let uniqueStaffIdFound = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      const {
        data: existingStaff,
        error: staffCheckError
      } = await supabase
        .from("sales_users")
        .select("id")
        .eq("staff_id", staffId)
        .maybeSingle();

      if (staffCheckError) {
        return NextResponse.json(
          {
            error:
              "Unable to verify the generated staff ID."
          },
          { status: 500 }
        );
      }

      if (!existingStaff) {
        uniqueStaffIdFound = true;
        break;
      }

      staffId = generateStaffId();
    }

    if (!uniqueStaffIdFound) {
      return NextResponse.json(
        {
          error:
            "Unable to generate a unique staff ID. Please try again."
        },
        { status: 500 }
      );
    }

    const payload = {
      owner_id: user.id,
      staff_id: staffId,
      name,
      email: email || null,
      phone: phone || null,
      pin_hash: hashPin(pin),
      role: "sales",
      status: "active",
      updated_at: new Date().toISOString()
    };

    const {
      data,
      error
    } = await supabase
      .from("sales_users")
      .insert(payload)
      .select(
        "id,staff_id,name,email,phone,role,status,created_at,updated_at"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      salesUser: data,
      temporaryPin: pin,
      usage: {
        plan: subscription.plan,
        used: activeSalesUsers + 1,
        limit: salesUserLimit,
        remaining: Math.max(
          salesUserLimit - activeSalesUsers - 1,
          0
        )
      },
      important:
        "Show this PIN to the sales person now. For security, it will not be shown again."
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create sales user.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}