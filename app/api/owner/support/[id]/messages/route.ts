import { NextResponse } from "next/server";

import {
  OwnerAccessError,
  requireOwnerUser
} from "@/lib/owner-auth";

import {
  createSupabaseAdminClient
} from "@/lib/supabase-admin";

import {
  notifyClientOfOwnerReply
} from "@/lib/support-email";

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

function validateAttachmentPath(
  value: unknown,
  ownerUserId: string
) {
  const attachmentPath = String(
    value ?? ""
  )
    .trim()
    .slice(0, 1000);

  if (!attachmentPath) {
    return {
      attachmentPath: null,
      error: null
    };
  }

  if (
    !attachmentPath.startsWith(
      `${ownerUserId}/`
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
      : "Unable to submit the support message.";

  return NextResponse.json(
    {
      error: message
    },
    {
      status: 500
    }
  );
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const ownerUser =
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
        "id,status,ticket_number,subject,customer_name,customer_email,category,priority,plan"
      )
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError) {
      console.error(
        "Unable to verify owner support ticket:",
        ticketError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify this support ticket."
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

    const body = await request
      .json()
      .catch(() => ({}));

    const message = String(
      body.message ?? ""
    ).trim();

    if (
      message.length < 1 ||
      message.length > 10000
    ) {
      return NextResponse.json(
        {
          error:
            "Message must contain between 1 and 10,000 characters."
        },
        {
          status: 400
        }
      );
    }

    const isInternal =
      body.is_internal === true;

    const {
      attachmentPath,
      error: attachmentError
    } = validateAttachmentPath(
      body.attachment_path ??
        body.attachment_url,
      ownerUser.id
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

    const {
      data: createdMessage,
      error: messageError
    } = await admin
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_user_id: ownerUser.id,
        sender_type: "owner",
        message,
        is_internal: isInternal,
        attachment_url: attachmentPath
      })
      .select(
        "id,ticket_id,sender_user_id,sender_type,message,is_internal,attachment_url,created_at,updated_at"
      )
      .single();

    if (messageError) {
      console.error(
        "Unable to create owner support message:",
        messageError
      );

      return NextResponse.json(
        {
          error:
            isInternal
              ? "Unable to save the internal note."
              : "Unable to send the customer reply."
        },
        {
          status: 500
        }
      );
    }

    let resultingStatus =
      String(ticket.status || "open");

    if (!isInternal) {
      const requestedStatus = String(
        body.status || ""
      )
        .trim()
        .toLowerCase();

      const nextStatus =
        requestedStatus &&
        ALLOWED_STATUSES.has(
          requestedStatus
        )
          ? requestedStatus
          : "waiting_for_client";

      const {
        error: statusError
      } = await admin
        .from("support_tickets")
        .update({
          status: nextStatus
        })
        .eq("id", ticketId);

      if (statusError) {
        console.error(
          "Reply saved but ticket status update failed:",
          statusError
        );
      } else {
        resultingStatus = nextStatus;
      }
    }

    /*
      Private internal notes are never emailed
      to the customer.
    */
    if (!isInternal) {
      await notifyClientOfOwnerReply(
        {
          id: String(ticket.id),

          ticketNumber: String(
            ticket.ticket_number || ""
          ),

          subject: String(
            ticket.subject || ""
          ),

          customerName: String(
            ticket.customer_name ||
              "ClientPilot AI Customer"
          ),

          customerEmail: String(
            ticket.customer_email || ""
          ),

          category: String(
            ticket.category || "other"
          ),

          priority: String(
            ticket.priority || "normal"
          ),

          plan: String(
            ticket.plan || "free"
          ),

          status: resultingStatus
        },
        message
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: isInternal
          ? "Internal note saved successfully."
          : "Reply sent successfully.",
        reply: createdMessage,
        ticketStatus: resultingStatus
      },
      {
        status: 201
      }
    );
  } catch (error) {
    return handleError(error);
  }
}
