import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function createShareToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please login first." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (body.create_share_link) {
      payload.share_token = createShareToken();
      payload.shared_at = new Date().toISOString();
    }

    if ("client_id" in body) payload.client_id = body.client_id ? String(body.client_id) : null;
    if ("client_name" in body) payload.client_name = body.client_name ? String(body.client_name) : null;
    if ("title" in body) payload.title = String(body.title || "");
    if ("content" in body) payload.content = String(body.content || "");
    if ("amount" in body) payload.amount = body.amount ? Number(body.amount) : null;
    if ("status" in body) payload.status = String(body.status || "draft");

    if ("deleted" in body) {
      const deleted = Boolean(body.deleted);
      payload.deleted = deleted;
      payload.deleted_at = deleted ? new Date().toISOString() : null;
    }

    const { data, error } = await supabase
      .from("proposals")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, proposal: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update proposal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
