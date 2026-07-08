import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please login first." }, { status: 401 });
    }

    const url = new URL(request.url);
    const recycle = url.searchParams.get("recycle") === "true";

    const { data, error } = await supabase
      .from("proposals")
      .select("*")
      .eq("user_id", user.id)
      .eq("deleted", recycle)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ proposals: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load proposals.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please login first." }, { status: 401 });
    }

    const body = await request.json();

    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: "Proposal title and content are required." },
        { status: 400 }
      );
    }

    const payload = {
      user_id: user.id,
      client_id: body.client_id ? String(body.client_id) : null,
      client_name: body.client_name ? String(body.client_name) : null,
      title: String(body.title),
      content: String(body.content),
      amount: body.amount ? Number(body.amount) : null,
      status: body.status ? String(body.status) : "draft",
      deleted: false,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("proposals")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, proposal: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create proposal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}