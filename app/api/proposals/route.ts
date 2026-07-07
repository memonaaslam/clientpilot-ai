import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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

    const clientId = String(body.clientId || "");
    const meetingId = body.meetingId ? String(body.meetingId) : null;
    const title = String(body.title || "Proposal Draft");
    const content = String(body.content || "");

    if (!clientId) {
      return NextResponse.json({ error: "Client is required." }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: "Proposal content is required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("proposals")
      .insert({
        user_id: user.id,
        client_id: clientId,
        meeting_id: meetingId,
        title,
        content,
        status: "draft"
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ proposalId: data.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 }
    );
  }
}