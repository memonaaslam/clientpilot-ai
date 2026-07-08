import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { createSupabaseAdminClient } from "@/lib/sales-session";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

function cleanText(value: unknown) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatMoney(value: unknown) {
  const amount = Number(value || 0);
  if (!amount) return "To be confirmed";
  return `$${amount.toLocaleString()}`;
}

function addPageNumber(doc: jsPDF, page: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140, 132, 148);
  doc.text(`Page ${page}`, 182, 287);
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, width: number, lineHeight = 6.5) {
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function addPageIfNeeded(doc: jsPDF, y: number, pageRef: { page: number }, neededSpace = 28) {
  if (y + neededSpace < 262) return y;

  addPageNumber(doc, pageRef.page);
  doc.addPage();
  pageRef.page += 1;

  doc.setDrawColor(235, 228, 235);
  doc.line(20, 22, 190, 22);

  return 38;
}

function addSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(248, 245, 248);
  doc.roundedRect(20, y - 6, 170, 12, 3, 3, "F");

  doc.setTextColor(113, 75, 103);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), 26, y + 2);

  return y + 18;
}

function createProposalPdf(proposal: any) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageRef = { page: 1 };

  const clientName = proposal.client_name || "Client";
  const title = proposal.title || "Proposal";
  const content = cleanText(proposal.content);
  const amount = formatMoney(proposal.amount);
  const status = proposal.status || "Draft";
  const createdAt = proposal.created_at
    ? new Date(proposal.created_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  // Premium header
  doc.setFillColor(113, 75, 103);
  doc.rect(0, 0, 210, 58, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("ClientPilot AI", 20, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Smart CRM • Follow-up Automation • Proposal Workflow", 20, 31);

  // Client info card
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(20, 42, 170, 36, 6, 6, "F");

  doc.setTextColor(96, 86, 104);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PREPARED FOR", 28, 56);

  doc.setTextColor(28, 19, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(clientName, 28, 66);

  doc.setTextColor(96, 86, 104);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Date: ${createdAt}`, 138, 56);
  doc.text(`Status: ${status}`, 138, 66);

  let y = 98;

  // Proposal title
  doc.setTextColor(28, 19, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  y = addWrappedText(doc, title, 20, y, 170, 8);

  y += 10;

  y = addSectionTitle(doc, "Project Overview", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(58, 50, 64);

  y = addWrappedText(
    doc,
    content || "This proposal outlines the recommended solution, scope of work, timeline, investment, and next steps required to move forward professionally.",
    24,
    y,
    160
  );

  y += 12;
  y = addPageIfNeeded(doc, y, pageRef, 45);

  y = addSectionTitle(doc, "Recommended Solution", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(58, 50, 64);

  y = addWrappedText(
    doc,
    "Our recommended approach is designed to simplify execution, improve communication, reduce manual follow-up work, and deliver a professional client experience from start to finish.",
    24,
    y,
    160
  );

  y += 12;
  y = addPageIfNeeded(doc, y, pageRef, 65);

  y = addSectionTitle(doc, "Scope of Work", y);

  const scope = [
    "Discovery and requirement confirmation",
    "Professional planning and workflow setup",
    "Proposal-ready deliverables and organized communication",
    "Follow-up support and client communication guidance",
    "Final review and next-step recommendations"
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(58, 50, 64);

  for (const item of scope) {
    y = addPageIfNeeded(doc, y, pageRef, 14);

    doc.setFillColor(113, 75, 103);
    doc.circle(26, y - 1.5, 1.5, "F");

    y = addWrappedText(doc, item, 32, y, 150);
    y += 3;
  }

  y += 10;
  y = addPageIfNeeded(doc, y, pageRef, 50);

  y = addSectionTitle(doc, "Investment", y);

  doc.setFillColor(252, 250, 252);
  doc.roundedRect(24, y, 160, 30, 5, 5, "F");

  doc.setTextColor(113, 75, 103);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(amount, 32, y + 18);

  doc.setTextColor(96, 86, 104);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Final investment may vary based on confirmed requirements.", 86, y + 18);

  y += 48;
  y = addPageIfNeeded(doc, y, pageRef, 58);

  y = addSectionTitle(doc, "Next Steps", y);

  const nextSteps = [
    "Review the proposal and confirm required changes.",
    "Approve the recommended scope and investment.",
    "Confirm timeline and communication channel.",
    "Begin work after approval and required confirmation."
  ];

  nextSteps.forEach((step, index) => {
    y = addPageIfNeeded(doc, y, pageRef, 14);

    doc.setTextColor(113, 75, 103);
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}.`, 24, y);

    doc.setTextColor(58, 50, 64);
    doc.setFont("helvetica", "normal");
    y = addWrappedText(doc, step, 34, y, 150);
    y += 3;
  });

  y += 16;
  y = addPageIfNeeded(doc, y, pageRef, 34);

  // Signature area only
  doc.setDrawColor(225, 215, 225);
  doc.line(24, y, 92, y);
  doc.line(118, y, 184, y);

  doc.setTextColor(96, 86, 104);
  doc.setFontSize(9);
  doc.text("Prepared By", 24, y + 7);
  doc.text("Client Approval", 118, y + 7);

  addPageNumber(doc, pageRef.page);

  return doc.output("arraybuffer");
}

export async function GET(request: Request) {
  try {
    const authSupabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Owner login required." }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id") || "";

    if (!id) {
      return NextResponse.json({ error: "Proposal ID is required." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: proposal, error } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !proposal) {
      return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
    }

    const pdf = createProposalPdf(proposal);
    const filename = `${String(proposal.title || "proposal").replace(/[^a-z0-9]/gi, "-").toLowerCase()}-proposal.pdf`;

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
