import { NextResponse } from "next/server";

import {
  OwnerAccessError,
  requireOwnerUser
} from "@/lib/owner-auth";

import {
  createSupabaseAdminClient
} from "@/lib/supabase-admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      : "Unable to process the support ticket.";

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
  _request: Request,
  context: RouteContext
) {
  try {
    await requireOwnerUser();

    const {
      id: ticketId
    } = await context.params;

    if (!UUID_PATTERN.test(ticketId)) {
      return NextResponse.json(
        {
          error: "Invalid support ticket ID."
        },
        {
          status: 400
        }
      );
    }

    const admin =
      createSupabaseAdminClient();

    const {
      data: ticket,
      error: ticketError
    } = await admin
      .from("support_tickets")
      .select(
        "id,ticket_number,account_id,user_id,customer_name,customer_email,company_name,plan,subject,category,priority,message,attachment_url,status,assigned_to,owner_notes,client_last_message_at,admin_last_reply_at,resolved_at,created_at,updated_at"
      )
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError) {
      console.error(
        "Unable to load owner support ticket:",
        ticketError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load this support ticket."
        },
        {
          status: 500
        }
      );
    }

    if (!ticket) {
      return NextResponse.json(
        {
          error: "Support ticket not found."
        },
        {
          status: 404
        }
      );
    }

    const {
      data: replies,
      error: messagesError
    } = await admin
      .from("support_ticket_messages")
      .select(
        "id,ticket_id,sender_user_id,sender_type,message,is_internal,attachment_url,created_at,updated_at"
      )
      .eq("ticket_id", ticketId)
      .order(
        "created_at",
        {
          ascending: true
        }
      );

    if (messagesError) {
      console.error(
        "Unable to load owner ticket messages:",
        messagesError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load the ticket conversation."
        },
        {
          status: 500
        }
      );
    }

    const initialMessage = {
      id: `initial-${ticket.id}`,
      ticket_id: ticket.id,
      sender_user_id: ticket.user_id,
      sender_type: "client",
      message: ticket.message,
      is_internal: false,
      attachment_url:
        ticket.attachment_url || null,
      created_at: ticket.created_at,
      updated_at: ticket.created_at,
      is_initial_message: true
    };

    const messages = [
      initialMessage,
      ...(replies || []).map(
        (reply) => ({
          ...reply,
          is_initial_message: false
        })
      )
    ];

    return NextResponse.json({
      ticket,
      messages
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    await requireOwnerUser();

    const {
      id: ticketId
    } = await context.params;

    if (!UUID_PATTERN.test(ticketId)) {
      return NextResponse.json(
        {
          error: "Invalid support ticket ID."
        },
        {
          status: 400
        }
      );
    }

    const body = await request
      .json()
      .catch(() => ({}));

    const updates: {
      status?: string;
      priority?: string;
      assigned_to?: string | null;
      owner_notes?: string | null;
    } = {};

    if (body.status !== undefined) {
      const status = String(
        body.status
      )
        .trim()
        .toLowerCase();

      if (!ALLOWED_STATUSES.has(status)) {
        return NextResponse.json(
          {
            error:
              "Please select a valid ticket status."
          },
          {
            status: 400
          }
        );
      }

      updates.status = status;
    }

    if (body.priority !== undefined) {
      const priority = String(
        body.priority
      )
        .trim()
        .toLowerCase();

      if (!ALLOWED_PRIORITIES.has(priority)) {
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

      updates.priority = priority;
    }

    if (body.assigned_to !== undefined) {
      const assignedTo = String(
        body.assigned_to || ""
      ).trim();

      if (
        assignedTo &&
        !UUID_PATTERN.test(assignedTo)
      ) {
        return NextResponse.json(
          {
            error:
              "The assigned user ID is invalid."
          },
          {
            status: 400
          }
        );
      }

      updates.assigned_to =
        assignedTo || null;
    }

    if (body.owner_notes !== undefined) {
      const ownerNotes = String(
        body.owner_notes || ""
      )
        .trim()
        .slice(0, 10000);

      updates.owner_notes =
        ownerNotes || null;
    }

    if (
      Object.keys(updates).length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No valid ticket changes were provided."
        },
        {
          status: 400
        }
      );
    }

    const admin =
      createSupabaseAdminClient();

    const {
      data: ticket,
      error
    } = await admin
      .from("support_tickets")
      .update(updates)
      .eq("id", ticketId)
      .select(
        "id,ticket_number,status,priority,assigned_to,owner_notes,resolved_at,updated_at"
      )
      .maybeSingle();

    if (error) {
      console.error(
        "Unable to update support ticket:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to update the support ticket."
        },
        {
          status: 500
        }
      );
    }

    if (!ticket) {
      return NextResponse.json(
        {
          error: "Support ticket not found."
        },
        {
          status: 404
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Support ticket updated successfully.",
      ticket
    });
  } catch (error) {
    return handleError(error);
  }
}
