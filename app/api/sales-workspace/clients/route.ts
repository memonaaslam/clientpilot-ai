import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getCurrentSalesSession } from "@/lib/sales-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getCurrentSalesSession();

    if (!session) {
      return NextResponse.json({ error: "Sales login required." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("clients")
      .select("id,name,phone,email,address,created_at,sales_user_id")
      .eq("user_id", session.ownerId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clients: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load clients.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSalesSession();

    if (!session) {
      return NextResponse.json({ error: "Sales login required." }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "Client name is required." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const payload = {
      user_id: session.ownerId,
      sales_user_id: session.salesUser.id,
      name: String(body.name),
      phone: body.phone ? String(body.phone) : null,
      email: body.email ? String(body.email) : null,
      address: body.address ? String(body.address) : null
    };

    const { data, error } = await supabase
      .from("clients")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, client: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create client.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}