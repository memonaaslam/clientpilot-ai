import { NextResponse } from "next/server";

import {
  OwnerAccessError,
  requireOwnerUser
} from "@/lib/owner-auth";

import {
  createSupabaseAdminClient
} from "@/lib/supabase-admin";

export const runtime = "nodejs";

const ALLOWED_STATUSES = new Set([
  "new",
  "open",
  "in_progress",
  "waiting_for_client",
  "resolved",
  "closed"
]);

const ALLOWED_PRIORITIES = new Set([
  "low",
  "normal",
  "high",
  "urgent"
]);

const ALLOWED_PLANS = new Set([
  "free",
  "starter",
  "pro",
  "agency"
]);

const ALLOWED_CATEGORIES = new Set([
  "login_issue",
  "subscription_issue",
  "payment_issue",
  "meeting_upload_issue",
  "transcription_issue",
  "proposal_issue",
  "task_issue",
  "reminder_issue",
  "account_issue",
  "feature_request",
  "other"
]);

function getSafeSearchTerm(
  value: string | null
) {
  return String(value || "")
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function getPositiveInteger(
  value: string | null,
  fallback: number
) {
  const parsed = Number.parseInt(
    String(value || ""),
    10
  );

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return parsed;
}

function handleError(error: unknown) {
  if (error instanceof OwnerAccessError) {
    return NextResponse.json(
      {
        error: error.message
      },
      {
        status: error.status
      }
    );
  }

  const message =
    error instanceof Error
      ? error.message
      : "Unable to load client support tickets.";

  return NextResponse.json(
    {
      error: message
    },
    {
      status: 500
    }
  );
}

export async function GET(
  request: Request
) {
  try {
    await requireOwnerUser();

    const admin =
      createSupabaseAdminClient();

    const url = new URL(request.url);

    const status = String(
      url.searchParams.get("status") || ""
    )
      .trim()
      .toLowerCase();

    const priority = String(
      url.searchParams.get("priority") || ""
    )
      .trim()
      .toLowerCase();

    const plan = String(
      url.searchParams.get("plan") || ""
    )
      .trim()
      .toLowerCase();

    const category = String(
      url.searchParams.get("category") || ""
    )
      .trim()
      .toLowerCase();

    const search = getSafeSearchTerm(
      url.searchParams.get("q")
    );

    const page = getPositiveInteger(
      url.searchParams.get("page"),
      1
    );

    const requestedPageSize =
      getPositiveInteger(
        url.searchParams.get("pageSize"),
        25
      );

    const pageSize = Math.min(
      requestedPageSize,
      100
    );

    const from =
      (page - 1) * pageSize;

    const to =
      from + pageSize - 1;

    let query = admin
      .from("support_tickets")
      .select(
        "id,ticket_number,account_id,user_id,customer_name,customer_email,company_name,plan,subject,category,priority,status,assigned_to,client_last_message_at,admin_last_reply_at,resolved_at,created_at,updated_at",
        {
          count: "exact"
        }
      );

    if (
      status &&
      ALLOWED_STATUSES.has(status)
    ) {
      query = query.eq(
        "status",
        status
      );
    }

    if (
      priority &&
      ALLOWED_PRIORITIES.has(priority)
    ) {
      query = query.eq(
        "priority",
        priority
      );
    }

    if (
      plan &&
      ALLOWED_PLANS.has(plan)
    ) {
      query = query.eq(
        "plan",
        plan
      );
    }

    if (
      category &&
      ALLOWED_CATEGORIES.has(category)
    ) {
      query = query.eq(
        "category",
        category
      );
    }

    if (search) {
      query = query.or(
        [
          `ticket_number.ilike.%${search}%`,
          `customer_name.ilike.%${search}%`,
          `customer_email.ilike.%${search}%`,
          `company_name.ilike.%${search}%`,
          `subject.ilike.%${search}%`
        ].join(",")
      );
    }

    const {
      data: tickets,
      error,
      count
    } = await query
      .order(
        "updated_at",
        {
          ascending: false
        }
      )
      .range(from, to);

    if (error) {
      console.error(
        "Unable to load owner support tickets:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to load client support tickets."
        },
        {
          status: 500
        }
      );
    }

    const [
      openResult,
      urgentResult,
      waitingResult,
      resolvedResult
    ] = await Promise.all([
      admin
        .from("support_tickets")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .in(
          "status",
          [
            "new",
            "open",
            "in_progress"
          ]
        ),

      admin
        .from("support_tickets")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "priority",
          "urgent"
        )
        .in(
          "status",
          [
            "new",
            "open",
            "in_progress",
            "waiting_for_client"
          ]
        ),

      admin
        .from("support_tickets")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "status",
          "waiting_for_client"
        ),

      admin
        .from("support_tickets")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "status",
          "resolved"
        )
    ]);

    const total =
      count || 0;

    const totalPages =
      Math.max(
        Math.ceil(
          total / pageSize
        ),
        1
      );

    return NextResponse.json({
      tickets: tickets || [],

      summary: {
        total,
        open:
          openResult.count || 0,
        urgent:
          urgentResult.count || 0,
        waitingForClient:
          waitingResult.count || 0,
        resolved:
          resolvedResult.count || 0
      },

      pagination: {
        page,
        pageSize,
        total,
        totalPages
      },

      filters: {
        status:
          ALLOWED_STATUSES.has(status)
            ? status
            : null,

        priority:
          ALLOWED_PRIORITIES.has(priority)
            ? priority
            : null,

        plan:
          ALLOWED_PLANS.has(plan)
            ? plan
            : null,

        category:
          ALLOWED_CATEGORIES.has(category)
            ? category
            : null,

        search:
          search || null
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
