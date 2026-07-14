import { NextResponse } from "next/server";

import {
  createSupabaseServerClient
} from "@/lib/supabase-server";

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

function validateAttachmentPath(
  value: unknown,
  userId: string
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

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
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
            "Please sign in before replying."
        },
        {
          status: 401
        }
      );
    }

    /*
      Verify ownership before inserting a reply
      or performing any service-role update.
    */
    const {
      data: ticket,
      error: ticketError
    } = await supabase
      .from("support_tickets")
      .select("id,user_id,status")
      .eq("id", ticketId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ticketError) {
      console.error(
        "Unable to verify support ticket:",
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
          error:
            "Support ticket not found."
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
            "Reply must contain between 1 and 10,000 characters."
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

    /*
      sender_type and is_internal are always
      enforced by the server. The customer
      cannot create owner replies or notes.
    */
    const {
      data: createdMessage,
      error: messageError
    } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_user_id: user.id,
        sender_type: "client",
        message,
        is_internal: false,
        attachment_url: attachmentPath
      })
      .select(
        "id,sender_user_id,sender_type,message,attachment_url,created_at,updated_at"
      )
      .single();

    if (messageError) {
      console.error(
        "Unable to create ticket reply:",
        messageError
      );

      return NextResponse.json(
        {
          error:
            "Unable to submit your reply."
        },
        {
          status: 500
        }
      );
    }

    /*
      A new customer reply reopens tickets that
      were waiting, resolved or closed.

      Service-role access is used only after
      confirming that this ticket belongs to
      the authenticated customer.
    */
    const currentStatus = String(
      ticket.status || ""
    )
      .trim()
      .toLowerCase();

    if (
      [
        "waiting_for_client",
        "resolved",
        "closed"
      ].includes(currentStatus)
    ) {
      const admin =
        createSupabaseAdminClient();

      const {
        error: reopenError
      } = await admin
        .from("support_tickets")
        .update({
          status: "open"
        })
        .eq("id", ticketId)
        .eq("user_id", user.id);

      if (reopenError) {
        console.error(
          "Unable to reopen support ticket:",
          reopenError
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Your reply was submitted successfully.",
        reply: createdMessage
      },
      {
        status: 201
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to submit ticket reply.";

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

