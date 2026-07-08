import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { createSupabaseAdminClient } from "@/lib/sales-session";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const SECTION_MARKERS = [
  "PROJECT UNDERSTANDING",
  "PROPOSED SCOPE",
  "EXPECTED DELIVERABLES",
  "PROJECT TIMELINE",
  "INVESTMENT",
  "NEXT STEPS",
  "PROJECT OVERVIEW",
  "SCOPE OF WORK",
  "RECOMMENDED SOLUTION"
];

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

function parseProposalContent(content: string, fallbackTitle: string, fallbackClient: string) {
  const lines = cleanText(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const firstSectionIndex = lines.findIndex((line) =>
    SECTION_MARKERS.includes(line.toUpperCase())
  );

  const headerLines = firstSectionIndex >= 0 ? lines.slice(0, firstSectionIndex) : [];
  const bodyLines = firstSectionIndex >= 0 ? lines.slice(firstSectionIndex) : lines;

  const titleLine =
    headerLines.find((line) => !line.includes(":") && !line.toUpperCase().startsWith("PROPOSAL")) ||
    fallbackTitle ||
    "Proposal";

  const proposalLabel =
    headerLines.find((line) => line.toUpperCase().includes("PROPOSAL")) ||
    "PROPOSAL DRAFT";

  const meta: { label: string; value: string }[] = [];

  headerLines.forEach((line) => {
    const splitIndex = line.indexOf(":");

    if (splitIndex > 0) {
      const label = line.slice(0, splitIndex).trim();
      const value = line.slice(splitIndex + 1).trim();

      if (label && value) {
        meta.push({ label, value });
      }
    }
  });

  if (!meta.some((item) => item.label.toLowerCase() === "client") && fallbackClient) {
    meta.push({ label: "Client", value: fallbackClient });
  }

  return {
    titleLine,
    proposalLabel,
    meta,
    body: bodyLines.join("\n")
  };
}

function addPageNumber(doc: jsPDF, page: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140, 132, 148);
  doc.text(`Page ${page}`, 182, 287);
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  lineHeight = 6.5
) {
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

function isSectionHeading(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length > 70) return false;
  if (/^\d+\./.test(trimmed)) return false;
  return SECTION_MARKERS.includes(trimmed.toUpperCase()) || /^[A-Z0-9 &/()\-]+$/.test(trimmed);
}

function renderProposalBody(doc: jsPDF, body: string, y: number, pageRef: { page: number }) {
  const lines = cleanText(body)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    y = addSectionTitle(doc, "Project Understanding", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(58, 50, 64);

    return addWrappedText(
      doc,
      "This proposal outlines the recommended solution, scope of work, timeline, investment, and next steps required to move forward professionally.",
      24,
      y,
      160
    );
  }

  for (const line of lines) {
    y = addPageIfNeeded(doc, y, pageRef, 22);

    if (isSectionHeading(line)) {
      y += 4;
      y = addSectionTitle(doc, line, y);
      continue;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(58, 50, 64);

    y = addWrappedText(doc, line, 24, y, 160);
    y += 3;
  }

  return y;
}

function createProposalPdf(proposal: any) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageRef = { page: 1 };

  const clientName = proposal.client_name || "Client";
  const fallbackTitle = proposal.title || "Proposal";
  const amount = formatMoney(proposal.amount);

  const parsed = parseProposalContent(
    cleanText(proposal.content),
    fallbackTitle,
    clientName
  );

  doc.setFillColor(113, 75, 103);
  doc.rect(0, 0, 210, 46, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("ClientPilot AI", 20, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Smart CRM • Follow-up Automation • Proposal Workflow", 20, 31);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(20, 36, 170, 74, 6, 6, "F");

  doc.setTextColor(28, 19, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  const titleLines = doc.splitTextToSize(parsed.titleLine, 154);
  doc.text(titleLines, 28, 52);

  let cardY = 52 + titleLines.length * 6.5 + 5;

  doc.setTextColor(113, 75, 103);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(parsed.proposalLabel.toUpperCase(), 28, cardY);

  cardY += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(75, 65, 84);

  parsed.meta.slice(0, 8).forEach((item, index) => {
    const x = index % 2 === 0 ? 28 : 108;
    const rowY = cardY + Math.floor(index / 2) * 8;

    doc.setFont("helvetica", "bold");
    doc.text(`${item.label}:`, x, rowY);

    doc.setFont("helvetica", "normal");
    const value = doc.splitTextToSize(item.value, 48)[0] || "";
    doc.text(value, x + 22, rowY);
  });

  let y = 128;

  y = renderProposalBody(doc, parsed.body, y, pageRef);

  y += 12;
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

  y += 52;
  y = addPageIfNeeded(doc, y, pageRef, 34);

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
