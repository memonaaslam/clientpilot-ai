import { NextResponse } from "next/server";
import { createSupabaseAdminClient, getCurrentSalesSession } from "@/lib/sales-session";

export const runtime = "nodejs";

function clean(value: unknown) {
  const text = String(value || "").trim();
  return text || "Not specified";
}

function buildProposalContent({
  client,
  title,
  notes,
  businessName,
  roleTitle,
  currency,
  amount
}: {
  client: any;
  title: string;
  notes: string;
  businessName: string;
  roleTitle: string;
  currency: string;
  amount: number | null;
}) {
  const budgetLine = amount
    ? `${currency} ${amount.toLocaleString()}`
    : "Budget was not clearly confirmed in the notes.";

  return `${client.name} - ${title}
PROPOSAL DRAFT
Prepared By: ${businessName}
Client: ${client.name}
Company: ${clean(client.address)}
Phone: ${clean(client.phone)}
Email: ${clean(client.email)}
Meeting: ${title}
Currency: ${currency}
Budget/pricing: ${budgetLine}
Timeline: Timeline was not clearly confirmed in the notes.

PROJECT UNDERSTANDING
${notes || "The client requirement was discussed. This proposal draft has been prepared based on the available meeting notes and client details."}

PROPOSED SCOPE
1. Requirement review and final briefing
2. Concept direction and recommended solution
3. Scope confirmation and deliverables planning
4. Timeline and execution planning
5. Official quotation preparation
6. Follow-up coordination and approval support

EXPECTED DELIVERABLES
- Professional proposal draft
- Clear project scope
- Timeline and next steps
- Follow-up message for client approval

RECOMMENDED NEXT STEP
Schedule a follow-up call or site visit, confirm the final scope, and send the official quotation for approval.

CLIENT FOLLOW-UP MESSAGE
Hi ${client.name}, thank you for your time. Based on our discussion, we have prepared a proposal draft covering your requirements and next steps. Please review it and let us know if you would like us to proceed with the official quotation.`;
}

export async function GET() {
  try {
    const session = await getCurrentSalesSession();

    if (!session) {
      return NextResponse.json({ error: "Sales login required." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("proposals")
      .select("id,title,client_name,amount,status,created_at,updated_at,sales_user_id,content_note")
      .eq("user_id", session.ownerId)
      .eq("sales_user_id", session.salesUser.id)
      .eq("deleted", false)
      .order("updated_at", { ascending: false })
      .limit(30);

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
    const session = await getCurrentSalesSession();

    if (!session) {
      return NextResponse.json({ error: "Sales login required." }, { status: 401 });
    }

    const body = await request.json();

    const clientId = String(body.client_id || "").trim();
    const title = String(body.title || "Client Proposal").trim();
    const notes = String(body.notes || "").trim();
    const amountRaw = String(body.amount || "").trim();

    if (!clientId) {
      return NextResponse.json({ error: "Please select a client." }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Proposal title is required." }, { status: 400 });
    }

    const amount = amountRaw ? Number(amountRaw) : null;

    if (amountRaw && (Number.isNaN(amount) || Number(amount) < 0)) {
      return NextResponse.json({ error: "Please enter a valid amount." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id,name,phone,email,address,sales_user_id")
      .eq("id", clientId)
      .eq("user_id", session.ownerId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    const { data: settings } = await supabase
      .from("business_settings")
      .select("business_name,logo_text,currency")
      .eq("user_id", session.ownerId)
      .maybeSingle();

    const businessName = settings?.business_name || "Memona Aslam";
    const roleTitle = settings?.logo_text || "Software developer";
    const currency = settings?.currency || "AED";

    const content = buildProposalContent({
      client,
      title,
      notes,
      businessName,
      roleTitle,
      currency,
      amount
    });

    const { data: proposal, error } = await supabase
      .from("proposals")
      .insert({
        user_id: session.ownerId,
        sales_user_id: session.salesUser.id,
        client_id: client.id,
        client_name: client.name,
        title: `${client.name} - ${title}`,
        content,
        amount,
        status: "pending_owner_review",
        deleted: false,
        updated_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, proposal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create proposal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

