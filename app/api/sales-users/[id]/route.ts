import { createHash, randomInt } from "crypto";
import { NextResponse } from "next/server";

import { getPlanConfig } from "@/lib/plans";
import { getUserSubscription } from "@/lib/subscription";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

function generatePin() {
  return String(randomInt(1000, 9999));
}

function hashPin(pin: string) {
  return createHash("sha256").update(pin).digest("hex");
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Sales user ID is required." },
        { status: 400 }
      );
    }

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

    const body = await request.json();

    const { data: salesUser, error: findError } =
      await supabase
        .from("sales_users")
        .select(
          "id,owner_id,staff_id,name,email,phone,role,status,created_at,updated_at"
        )
        .eq("id", id)
        .eq("owner_id", user.id)
        .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { error: findError.message },
        { status: 500 }
      );
    }

    if (!salesUser) {
      return NextResponse.json(
        { error: "Sales user not found." },
        { status: 404 }
      );
    }

    if (body.reset_pin === true) {
      const pin = generatePin();

      const { data, error } = await supabase
        .from("sales_users")
        .update({
          pin_hash: hashPin(pin),
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("owner_id", user.id)
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
        important:
          "Show this PIN to the sales person now. It will not be shown again."
      });
    }

    const requestedStatus =
      typeof body.status === "string"
        ? body.status.trim().toLowerCase()
        : "";

    if (
      requestedStatus !== "active" &&
      requestedStatus !== "inactive"
    ) {
      return NextResponse.json(
        {
          error:
            "Status must be either active or inactive."
        },
        { status: 400 }
      );
    }

    if (
      requestedStatus === "active" &&
      salesUser.status !== "active"
    ) {
      const subscription =
        await getUserSubscription(user.id);

      const planConfig = getPlanConfig(
        subscription.plan
      );

      const salesUserLimit =
        planConfig.includedSalesUsers;

      if (salesUserLimit <= 0) {
        return NextResponse.json(
          {
            error:
              "Your current plan does not include sales users."
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

      const activeCount = count ?? 0;

      if (activeCount >= salesUserLimit) {
        return NextResponse.json(
          {
            error: `${planConfig.name} allows ${salesUserLimit} active sales user${
              salesUserLimit === 1 ? "" : "s"
            }.`,
            code: "SALES_USER_LIMIT_REACHED",
            used: activeCount,
            limit: salesUserLimit
          },
          { status: 403 }
        );
      }
    }

    const { data, error } = await supabase
      .from("sales_users")
      .update({
        status: requestedStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("owner_id", user.id)
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
      salesUser: data
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update sales user.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}