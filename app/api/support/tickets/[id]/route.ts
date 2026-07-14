import { NextResponse } from "next/server";

import {
  createSupabaseServerClient
} from "@/lib/supabase-server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
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
            "Please sign in to view this support ticket."
        },
        {
          status: 401
        }
      );
    }

    /*
      The user_id filter and Supabase RLS both
      ensure the client can only access their
      own support ticket.
    */
    const {
      data: ticket,
      error: ticketError
    } = await supabase
      .from("support_tickets")
      .select(
        "id,ticket_number,account_id,user_id,customer_name,customer_email,company_name,plan,subject,category,priority,message,attachment_url,status,client_last_message_at,admin_last_reply_at,resolved_at,created_at,updated_at"
      )
      .eq("id", ticketId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ticketError) {
      console.error(
        "Unable to load support ticket:",
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
          error:
            "Support ticket not found."
        },
        {
          status: 404
        }
      );
    }

    /*
      Internal owner notes are excluded both
      by this filter and by the database RLS
      policy.
    */
    const {
      data: replyMessages,
      error: messagesError
    } = await supabase
      .from("support_ticket_messages")
      .select(
        "id,sender_user_id,sender_type,message,attachment_url,created_at,updated_at"
      )
      .eq("ticket_id", ticketId)
      .eq("is_internal", false)
      .order(
        "created_at",
        {
          ascending: true
        }
      );

    if (messagesError) {
      console.error(
        "Unable to load ticket messages:",
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

    /*
      The original ticket message is stored in
      support_tickets.message. Return it as the
      first conversation message.
    */
    const initialMessage = {
      id: `initial-${ticket.id}`,
      sender_user_id: ticket.user_id,
      sender_type: "client",
      message: ticket.message,
      attachment_url:
        ticket.attachment_url || null,
      created_at: ticket.created_at,
      updated_at: ticket.created_at,
      is_initial_message: true
    };

    const messages = [
      initialMessage,
      ...(replyMessages || []).map(
        (message) => ({
          ...message,
          is_initial_message: false
        })
      )
    ];

    return NextResponse.json({
      ticket,
      messages
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load support ticket.";

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

