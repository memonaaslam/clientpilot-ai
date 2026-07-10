import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase admin credentials are missing.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token = String(body.token || "").trim();
    const action = String(body.action || "").trim();
    const note = String(body.note || "").trim();

    if (!token) {
      return NextResponse.json({ error: "Proposal token is required." }, { status: 400 });
    }

    if (action !== "accepted" && action !== "changes_requested") {
      return NextResponse.json({ error: "Invalid proposal response." }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const updateData: Record<string, unknown> = {
      status: action,
      updated_at: new Date().toISOString()
    };

    if (action === "changes_requested") {
      updateData.content_note = note || "No note provided by client.";
    }

    if (action === "accepted") {
      updateData.content_note = note || null;
    }

    const { data, error } = await supabase
      .from("proposals")
      .update(updateData)
      .eq("share_token", token)
      .eq("deleted", false)
      .select("id,title,status,content_note")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Proposal not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      proposal: data
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit proposal response.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
