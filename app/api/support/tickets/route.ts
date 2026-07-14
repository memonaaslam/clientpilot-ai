import { NextResponse } from "next/server";

import {
  createSupabaseServerClient
} from "@/lib/supabase-server";

import {
  getUserSubscription
} from "@/lib/subscription";

export const runtime = "nodejs";

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

const ALLOWED_PRIORITIES = new Set([
  "low",
  "normal",
  "high",
  "urgent"
]);

function getText(
  value: unknown,
  maximumLength: number
) {
  return String(value ?? "")
    .trim()
    .slice(0, maximumLength);
}

function getFirstText(
  values: unknown[],
  maximumLength: number
) {
  for (const value of values) {
    const result = getText(
      value,
      maximumLength
    );

    if (result) {
      return result;
    }
  }

  return "";
}

function validateAttachmentPath(
  value: unknown,
  userId: string
) {
  const attachmentPath = getText(
    value,
    1000
  );

  if (!attachmentPath) {
    return {
      attachmentPath: null,
      error: null
    };
  }

  if (
    !attachmentPath.startsWith(
      `${userId}/`
    ) ||
    attachmentPath.includes("..") ||
    attachmentPath.startsWith("/") ||
    attachmentPath.includes("\\")
  ) {
    return {
      attachmentPath: null,
      error:
        "The support attachment path is invalid."
    };
  }

  return {
    attachmentPath,
    error: null
  };
}

export async function GET() {
  try {
    const supabase =
      await createSupabaseServerClient();

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Please sign in to view your support tickets."
        },
        {
          status: 401
        }
      );
    }

    /*
      RLS also restricts the result to the
      authenticated user's own tickets.
    */
    const {
      data,
      error
    } = await supabase
      .from("support_tickets")
      .select(
        [
          "id",
          "ticket_number",
          "subject",
          "category",
          "priority",
          "status",
          "plan",
          "company_name",
          "client_last_message_at",
          "admin_last_reply_at",
          "resolved_at",
          "created_at",
          "updated_at"
        ].join(",")
      )
      .eq("user_id", user.id)
      .order(
        "updated_at",
        {
          ascending: false
        }
      );

    if (error) {
      console.error(
        "Unable to load support tickets:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to load your support tickets."
        },
        {
          status: 500
        }
      );
    }

    return NextResponse.json({
      tickets: data || []
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load support tickets.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: 500
      }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createSupabaseServerClient();

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Please sign in before submitting an issue."
        },
        {
          status: 401
        }
      );
    }

    const body = await request
      .json()
      .catch(() => ({}));

    const subject = String(
      body.subject ?? ""
    ).trim();

    const message = String(
      body.message ?? ""
    ).trim();

    const category = String(
      body.category ?? ""
    )
      .trim()
      .toLowerCase();

    const priority = String(
      body.priority ?? "normal"
    )
      .trim()
      .toLowerCase();

    if (
      subject.length < 3 ||
      subject.length > 200
    ) {
      return NextResponse.json(
        {
          error:
            "Subject must contain between 3 and 200 characters."
        },
        {
          status: 400
        }
      );
    }

    if (
      message.length < 5 ||
      message.length > 10000
    ) {
      return NextResponse.json(
        {
          error:
            "Message must contain between 5 and 10,000 characters."
        },
        {
          status: 400
        }
      );
    }

    if (
      !ALLOWED_CATEGORIES.has(category)
    ) {
      return NextResponse.json(
        {
          error:
            "Please select a valid issue category."
        },
        {
          status: 400
        }
      );
    }

    if (
      !ALLOWED_PRIORITIES.has(priority)
    ) {
      return NextResponse.json(
        {
          error:
            "Please select a valid priority."
        },
        {
          status: 400
        }
      );
    }

    const {
      attachmentPath,
      error: attachmentError
    } = validateAttachmentPath(
      body.attachment_path ??
        body.attachment_url,
      user.id
    );

    if (attachmentError) {
      return NextResponse.json(
        {
          error: attachmentError
        },
        {
          status: 400
        }
      );
    }

    const metadata =
      (user.user_metadata || {}) as Record<
        string,
        unknown
      >;

    const customerEmail = String(
      user.email || ""
    )
      .trim()
      .toLowerCase();

    if (!customerEmail) {
      return NextResponse.json(
        {
          error:
            "Your account does not have a valid email address."
        },
        {
          status: 400
        }
      );
    }

    const customerName = getFirstText(
      [
        body.name,
        body.customer_name,
        metadata.full_name,
        metadata.name,
        customerEmail.split("@")[0],
        "ClientPilot AI Customer"
      ],
      150
    );

    const companyName =
      getFirstText(
        [
          body.company,
          body.company_name,
          metadata.company_name,
          metadata.company
        ],
        200
      ) || null;

    /*
      The subscription plan comes from the
      authenticated user's database record.
      The client cannot submit a fake plan.
    */
    const subscription =
      await getUserSubscription(user.id);

    const payload = {
      account_id: user.id,
      user_id: user.id,

      customer_name: customerName,
      customer_email: customerEmail,
      company_name: companyName,

      plan: subscription.plan,

      subject,
      category,
      priority,
      message,

      attachment_url: attachmentPath,

      status: "new",
      client_last_message_at:
        new Date().toISOString()
    };

    /*
      ticket_number is not supplied here.
      Supabase generates CP-SUP-000001
      through the database trigger.
    */
    const {
      data,
      error
    } = await supabase
      .from("support_tickets")
      .insert(payload)
      .select(
        [
          "id",
          "ticket_number",
          "subject",
          "category",
          "priority",
          "status",
          "plan",
          "company_name",
          "attachment_url",
          "created_at",
          "updated_at"
        ].join(",")
      )
      .single();

    if (error) {
      console.error(
        "Unable to create support ticket:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to submit your support issue."
        },
        {
          status: 500
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Your issue was submitted successfully.",
        ticket: data
      },
      {
        status: 201
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to submit the support issue.";

    return NextResponse.json(
      {
        error: message
      },
      {
        status: 500
      }
    );
  }
}
