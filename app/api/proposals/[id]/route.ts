import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/sales-session";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function createShareToken() {
  return randomBytes(18).toString("hex");
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const authSupabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const supabase = createSupabaseAdminClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (body.create_share_link === true) {
      updateData.share_token = createShareToken();
      updateData.shared_at = new Date().toISOString();
    }

    if (body.client_id !== undefined) {
      updateData.client_id = body.client_id
        ? String(body.client_id)
        : null;
    }

    if (body.client_name !== undefined) {
      updateData.client_name = body.client_name
        ? String(body.client_name)
        : null;
    }

    if (body.title !== undefined) {
      updateData.title = String(body.title);
    }

    if (body.content !== undefined) {
      updateData.content = String(body.content);
    }

    if (body.amount !== undefined) {
      updateData.amount =
        body.amount === "" || body.amount === null
          ? null
          : Number(body.amount);
    }

    if (body.status !== undefined) {
      updateData.status = String(body.status);
    }

    if (body.content_note !== undefined) {
      updateData.content_note = body.content_note
        ? String(body.content_note)
        : null;
    }

    if (body.deleted !== undefined) {
      updateData.deleted = Boolean(body.deleted);
      updateData.deleted_at = body.deleted
        ? new Date().toISOString()
        : null;
    }

    const { data, error } = await supabase
      .from("proposals")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Proposal was not found or does not belong to this account." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      proposal: data
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update proposal.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}