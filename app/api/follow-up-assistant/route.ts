import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/sales-session";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

function cleanPhone(phone?: string | null) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function createFollowUpMessage(params: {
  clientName: string;
  type: string;
  purpose: string;
  tone: string;
  notes: string;
}) {
  const { clientName, type, purpose, tone, notes } = params;

  const friendlyStart =
    tone === "premium"
      ? `Hello ${clientName}, I hope you are doing well.`
      : `Hi ${clientName}, hope you are doing well.`;

  const purposeLine =
    purpose === "proposal"
      ? "I wanted to follow up regarding the proposal and see if you would like me to make any changes or clarify anything."
      : purpose === "meeting"
      ? "Thank you for the recent discussion. I wanted to follow up and confirm the next steps."
      : purpose === "payment"
      ? "I wanted to follow up regarding the pending payment/update so we can move forward smoothly."
      : purpose === "cold-lead"
      ? "I wanted to reconnect and check if this is still something you would like to move forward with."
      : "I wanted to follow up and check how you would like to proceed.";

  const extra = notes ? `\n\nAdditional note: ${notes}` : "";

  if (type === "email") {
    return {
      subject: `Follow-up with ${clientName}`,
      body: `${friendlyStart}

${purposeLine}${extra}

Please let me know what works best for you.

Kind regards,
ClientPilot AI`
    };
  }

  return {
    subject: "",
    body: `${friendlyStart}

${purposeLine}${extra}

Please let me know what works best for you.`
  };
}

export async function GET() {
  try {
    const authSupabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Owner login required." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("clients")
      .select("id,name,phone,email,address,created_at")
      .eq("user_id", user.id)
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
    const authSupabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Owner login required." }, { status: 401 });
    }

    const body = await request.json();

    const clientId = String(body.client_id || "");
    const type = String(body.type || "whatsapp");
    const purpose = String(body.purpose || "general");
    const tone = String(body.tone || "friendly");
    const notes = String(body.notes || "").trim();

    if (!clientId) {
      return NextResponse.json({ error: "Please select a client." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: client, error } = await supabase
      .from("clients")
      .select("id,name,phone,email,address")
      .eq("id", clientId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    const result = createFollowUpMessage({
      clientName: client.name || "there",
      type,
      purpose,
      tone,
      notes
    });

    const phone = cleanPhone(client.phone);
    const whatsappUrl =
      phone && result.body
        ? `https://wa.me/${phone}?text=${encodeURIComponent(result.body)}`
        : "";

    const mailtoUrl =
      client.email && result.body
        ? `mailto:${client.email}?subject=${encodeURIComponent(result.subject)}&body=${encodeURIComponent(result.body)}`
        : "";

    return NextResponse.json({
      success: true,
      client,
      type,
      subject: result.subject,
      message: result.body,
      whatsappUrl,
      mailtoUrl
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate follow-up.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
