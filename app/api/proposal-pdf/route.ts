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

function addFooter(doc: jsPDF, page: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 110, 130);
  doc.text("Prepared with ClientPilot AI", 20, 285);
  doc.text(`Page ${page}`, 180, 285);
}

function addSection(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(248, 245, 248);
  doc.roundedRect(20, y - 6, 170, 12, 3, 3, "F");

  doc.setTextColor(113, 75, 103);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), 26, y + 2);

  return y + 18;
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, width: number) {
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * 6.5;
}

function newPageIfNeeded(doc: jsPDF, y: number, pageRef: { page: number }) {
  if (y < 260) return y;

  addFooter(doc, pageRef.page);
  doc.addPage();
  pageRef.page += 1;

  return 28;
}

function createProposalPdf(proposal: any) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageRef = { page: 1 };

  const clientName = proposal.client_name || "Client";
  const title = proposal.title || "Professional Proposal";
  const content = cleanText(proposal.content);
  const amount = formatMoney(proposal.amount);
  const status = proposal.status || "Draft";
  const createdAt = proposal.created_at
    ? new Date(proposal.created_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  doc.setFillColor(113, 75, 103);
  doc.rect(0, 0, 210, 62, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("ClientPilot AI", 20, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Smart CRM • Follow-up Automation • Proposal Workflow", 20, 31);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(20, 43, 170, 45, 6, 6, "F");

  doc.setTextColor(28, 19, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("Professional Proposal", 28, 60);

  doc.setTextColor(96, 86, 104);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Prepared for: ${clientName}`, 28, 71);
  doc.text(`Date: ${createdAt}`, 138, 71);
  doc.text(`Status: ${status}`, 138, 79);

  let y = 106;

  doc.setTextColor(28, 19, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  y = addWrappedText(doc, title, 20, y, 170);

  y += 10;

  y = addSection(doc, "Project Overview", y);
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

  y += 10;
  y = newPageIfNeeded(doc, y, pageRef);

  y = addSection(doc, "Recommended Solution", y);
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

  y += 10;
  y = newPageIfNeeded(doc, y, pageRef);

  y = addSection(doc, "Scope of Work", y);

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
    y = newPageIfNeeded(doc, y, pageRef);

    doc.setFillColor(113, 75, 103);
    doc.circle(26, y - 1.5, 1.5, "F");

    y = addWrappedText(doc, item, 32, y, 150);
    y += 3;
  }

  y += 8;
  y = newPageIfNeeded(doc, y, pageRef);

  y = addSection(doc, "Investment", y);

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
  y = newPageIfNeeded(doc, y, pageRef);

  y = addSection(doc, "Next Steps", y);

  const nextSteps = [
    "Review the proposal and confirm required changes.",
    "Approve the recommended scope and investment.",
    "Confirm timeline and communication channel.",
    "Begin work after approval and required confirmation."
  ];

  nextSteps.forEach((step, index) => {
    y = newPageIfNeeded(doc, y, pageRef);

    doc.setTextColor(113, 75, 103);
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}.`, 24, y);

    doc.setTextColor(58, 50, 64);
    doc.setFont("helvetica", "normal");
    y = addWrappedText(doc, step, 34, y, 150);
    y += 3;
  });

  y += 12;
  y = newPageIfNeeded(doc, y, pageRef);

  doc.setDrawColor(225, 215, 225);
  doc.line(24, y, 92, y);
  doc.line(118, y, 184, y);

  doc.setTextColor(96, 86, 104);
  doc.setFontSize(9);
  doc.text("Prepared By", 24, y + 7);
  doc.text("Client Approval", 118, y + 7);

  y += 24;

  doc.setFillColor(248, 245, 248);
  doc.roundedRect(20, y, 170, 24, 5, 5, "F");

  doc.setTextColor(113, 75, 103);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Proposal Validity", 28, y + 10);

  doc.setTextColor(96, 86, 104);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("This proposal is valid for 14 days from the date of issue.", 28, y + 18);

  addFooter(doc, pageRef.page);

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
