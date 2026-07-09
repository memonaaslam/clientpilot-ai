import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { createSupabaseAdminClient } from "@/lib/sales-session";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

type BusinessSettings = {
  business_name?: string | null;
  logo_text?: string | null;
  logo_url?: string | null;
  currency?: string | null;
};

const SECTION_MARKERS = [
  "PROJECT UNDERSTANDING",
  "PROPOSED SCOPE",
  "EXPECTED DELIVERABLES",
  "PROJECT TIMELINE",
  "TIMELINE",
  "BUDGET",
  "BUDGET/PRICING",
  "PRICING",
  "INVESTMENT",
  "NEXT STEPS",
  "EMAIL SIGNATURE",
  "FOOTER",
  "PROPOSAL VALIDITY"
];

const SKIP_SECTIONS = ["EMAIL SIGNATURE", "FOOTER", "PROPOSAL VALIDITY", "INVESTMENT"];

const META_LABELS_TO_SKIP_IN_BODY = [
  "prepared by",
  "client",
  "company",
  "phone",
  "email",
  "meeting",
  "currency",
  "budget",
  "budget/pricing",
  "timeline"
];

function cleanText(value: unknown) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "M"
  );
}

function isSectionHeading(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length > 80) return false;
  if (/^\d+\./.test(trimmed)) return false;

  return SECTION_MARKERS.includes(trimmed.toUpperCase()) || /^[A-Z0-9 &/()\-]+$/.test(trimmed);
}

function parseProposalContent(content: string, fallbackClient: string) {
  const lines = cleanText(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const firstSectionIndex = lines.findIndex((line) =>
    SECTION_MARKERS.includes(line.toUpperCase())
  );

  const headerLines = firstSectionIndex >= 0 ? lines.slice(0, firstSectionIndex) : [];
  const bodyLines = firstSectionIndex >= 0 ? lines.slice(firstSectionIndex) : lines;

  const proposalLabel =
    headerLines.find((line) => line.toUpperCase().includes("PROPOSAL")) ||
    "PROPOSAL DRAFT";

  const metaMap = new Map<string, string>();

  headerLines.forEach((line) => {
    const splitIndex = line.indexOf(":");

    if (splitIndex > 0) {
      const label = line.slice(0, splitIndex).trim();
      const value = line.slice(splitIndex + 1).trim();

      if (label && value) {
        metaMap.set(label.toLowerCase(), value);
      }
    }
  });

  if (!metaMap.has("client") && fallbackClient) {
    metaMap.set("client", fallbackClient);
  }

  if (!metaMap.has("budget/pricing")) {
    metaMap.set("budget/pricing", "Budget was not clearly confirmed in the notes.");
  }

  if (!metaMap.has("timeline")) {
    metaMap.set("timeline", "Timeline was not clearly confirmed in the notes.");
  }

  const preferredOrder = [
    "prepared by",
    "client",
    "company",
    "phone",
    "email",
    "meeting",
    "currency",
    "budget/pricing",
    "timeline"
  ];

  const labelNames: Record<string, string> = {
    "prepared by": "Prepared By",
    client: "Client",
    company: "Company",
    phone: "Phone",
    email: "Email",
    meeting: "Meeting",
    currency: "Currency",
    "budget/pricing": "Budget/pricing",
    timeline: "Timeline"
  };

  const meta = preferredOrder
    .filter((key) => metaMap.has(key))
    .map((key) => ({
      label: labelNames[key] || key,
      value: metaMap.get(key) || ""
    }));

  return {
    proposalLabel,
    meta,
    body: bodyLines.join("\n")
  };
}

async function urlToDataUrl(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "image/png";
    const arrayBuffer = await response.arrayBuffer();

    if (!contentType.includes("png") && !contentType.includes("jpeg") && !contentType.includes("jpg")) {
      return null;
    }

    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

async function localImageToDataUrl(fileName: string) {
  try {
    const filePath = path.join(process.cwd(), "public", fileName);
    const buffer = await readFile(filePath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function imageFormat(dataUrl: string) {
  if (dataUrl.startsWith("data:image/jpeg")) return "JPEG";
  if (dataUrl.startsWith("data:image/jpg")) return "JPEG";
  return "PNG";
}

function safeAddImage(
  doc: jsPDF,
  dataUrl: string | null,
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (!dataUrl) return false;

  try {
    doc.addImage(dataUrl, imageFormat(dataUrl), x, y, width, height);
    return true;
  } catch {
    return false;
  }
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

function addSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(248, 245, 248);
  doc.roundedRect(20, y - 6, 170, 12, 3, 3, "F");

  doc.setTextColor(113, 75, 103);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), 26, y + 2);

  return y + 18;
}

function shouldSkipLine(line: string) {
  const lowered = line.toLowerCase().trim();

  if (lowered.includes("this proposal is valid")) return true;
  if (lowered === "best regards,") return true;
  if (lowered === "sales team") return true;
  if (lowered.includes("final investment may vary")) return true;
  if (lowered === "to be confirmed") return true;

  const splitIndex = lowered.indexOf(":");

  if (splitIndex > 0) {
    const label = lowered.slice(0, splitIndex).trim();
    return META_LABELS_TO_SKIP_IN_BODY.includes(label);
  }

  return false;
}

function addFooterBrand(doc: jsPDF, page: number, makzoraLogo: string | null) {
  const baseY = 262;

  doc.setDrawColor(238, 230, 238);
  doc.line(24, 255, 186, 255);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(113, 75, 103);
  doc.text("ClientPilot AI", 105, baseY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(140, 132, 148);
  doc.text("Smart CRM • Follow-up Automation • Proposal Workflow", 105, baseY + 5, {
    align: "center"
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 110, 126);
  doc.text("Software Developed by", 105, baseY + 14, { align: "center" });

  const logoAdded = safeAddImage(doc, makzoraLogo, 91, baseY + 17, 28, 10);

  if (!logoAdded) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(28, 19, 36);
    doc.text("Makzora", 105, baseY + 24, { align: "center" });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(140, 132, 148);
  doc.text(`Page ${page}`, 186, 288);
}

function addPageIfNeeded(
  doc: jsPDF,
  y: number,
  pageRef: { page: number },
  makzoraLogo: string | null,
  neededSpace = 28
) {
  if (y + neededSpace < 248) return y;

  addFooterBrand(doc, pageRef.page, makzoraLogo);
  doc.addPage();
  pageRef.page += 1;

  doc.setDrawColor(235, 228, 235);
  doc.line(20, 48, 190, 48);

  return 62;
}

function renderProposalBody(
  doc: jsPDF,
  body: string,
  y: number,
  pageRef: { page: number },
  makzoraLogo: string | null
) {
  const lines = cleanText(body)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let skipMode = false;

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (isSectionHeading(line)) {
      if (SKIP_SECTIONS.includes(upper)) {
        skipMode = true;
        continue;
      }

      skipMode = false;
      y = addPageIfNeeded(doc, y, pageRef, makzoraLogo, 22);
      y += 4;
      y = addSectionTitle(doc, line, y);
      continue;
    }

    if (skipMode) continue;
    if (shouldSkipLine(line)) continue;

    y = addPageIfNeeded(doc, y, pageRef, makzoraLogo, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(58, 50, 64);

    y = addWrappedText(doc, line, 24, y, 160);
    y += 3;
  }

  return y;
}

async function createProposalPdf(
  proposal: any,
  settings: BusinessSettings | null
) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageRef = { page: 1 };

  const clientName = proposal.client_name || "Client";
  const parsed = parseProposalContent(cleanText(proposal.content), clientName);

  const businessName = settings?.business_name?.trim() || "Memona Aslam";
  const businessRole = settings?.logo_text?.trim() || "Software developer";
  const businessLogoUrl = settings?.logo_url?.trim() || "";
  const businessLogo = businessLogoUrl ? await urlToDataUrl(businessLogoUrl) : null;
  const makzoraLogo = await localImageToDataUrl("makzora-logo-official.png");

  const proposalTitle = proposal.title || `${clientName} Proposal`;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  const logoAdded = safeAddImage(doc, businessLogo, 20, 16, 28, 28);

  if (!logoAdded) {
    doc.setFillColor(113, 75, 103);
    doc.roundedRect(20, 18, 24, 24, 5, 5, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(getInitials(businessName), 32, 33, { align: "center" });
  }

  doc.setTextColor(28, 19, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text(businessName, 54, 27);

  doc.setTextColor(120, 110, 126);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(businessRole, 54, 35);

  doc.setDrawColor(235, 228, 235);
  doc.line(20, 50, 190, 50);

  doc.setFillColor(250, 247, 250);
  doc.roundedRect(20, 60, 170, 82, 6, 6, "F");

  doc.setTextColor(28, 19, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);

  const titleLines = doc.splitTextToSize(proposalTitle, 154);
  doc.text(titleLines, 28, 76);

  let cardY = 76 + titleLines.length * 6.5 + 5;

  doc.setTextColor(113, 75, 103);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(parsed.proposalLabel.toUpperCase(), 28, cardY);

  cardY += 10;

  doc.setFontSize(8.5);
  doc.setTextColor(75, 65, 84);

  parsed.meta.slice(0, 9).forEach((item, index) => {
    const x = index % 2 === 0 ? 28 : 108;
    const rowY = cardY + Math.floor(index / 2) * 8;

    doc.setFont("helvetica", "bold");
    doc.text(`${item.label}:`, x, rowY);

    doc.setFont("helvetica", "normal");
    const value = doc.splitTextToSize(item.value, 50)[0] || "";
    doc.text(value, x + 24, rowY);
  });

  let y = 160;

  y = renderProposalBody(doc, parsed.body, y, pageRef, makzoraLogo);

  y += 16;
  y = addPageIfNeeded(doc, y, pageRef, makzoraLogo, 40);

  doc.setDrawColor(225, 215, 225);
  doc.line(24, y, 92, y);
  doc.line(118, y, 184, y);

  doc.setTextColor(96, 86, 104);
  doc.setFontSize(9);
  doc.text("Prepared By", 24, y + 7);
  doc.text("Client Approval", 118, y + 7);

  addFooterBrand(doc, pageRef.page, makzoraLogo);

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

    const { data: settings } = await supabase
      .from("business_settings")
      .select("business_name,logo_text,logo_url,currency")
      .eq("user_id", user.id)
      .maybeSingle();

    const pdf = await createProposalPdf(proposal, settings);

    const filename = `${String(proposal.title || "proposal")
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()}-proposal.pdf`;

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




