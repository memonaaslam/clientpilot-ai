import { Resend } from "resend";

export type SupportEmailTicket = {
  id: string;
  ticketNumber: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  category: string;
  priority: string;
  plan: string;
  status: string;
};

type SupportEmailContent = {
  to: string;
  subject: string;
  eyebrow: string;
  title: string;
  introduction: string;
  messageLabel: string;
  message: string;
  buttonLabel: string;
  buttonUrl: string;
  ticket: SupportEmailTicket;
};

type EmailConfiguration = {
  apiKey: string;
  from: string;
  inbox: string;
  replyTo: string;
  appUrl: string;
};

function getText(
  value: unknown,
  maximumLength = 10000
) {
  return String(value ?? "")
    .trim()
    .slice(0, maximumLength);
}

function cleanHeader(value: unknown) {
  return getText(value, 300)
    .replace(/[\r\n]+/g, " ")
    .trim();
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatLabel(value: unknown) {
  return getText(value, 100)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function getConfiguration():
  | EmailConfiguration
  | null {
  const apiKey = getText(
    process.env.RESEND_API_KEY,
    500
  );

  const from = getText(
    process.env.SUPPORT_EMAIL_FROM,
    300
  );

  if (!apiKey || !from) {
    return null;
  }

  const inbox =
    getText(
      process.env.SUPPORT_EMAIL_TO,
      300
    ) || "info@makzora.com";

  const replyTo =
    getText(
      process.env.SUPPORT_EMAIL_REPLY_TO,
      300
    ) || inbox;

  const appUrl = (
    getText(
      process.env.SUPPORT_APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL,
      500
    ) ||
    "https://www.makzora.com/clientpilotai"
  ).replace(/\/+$/, "");

  return {
    apiKey,
    from,
    inbox,
    replyTo,
    appUrl
  };
}

function buildTicketRows(
  ticket: SupportEmailTicket
) {
  const rows = [
    ["Ticket", ticket.ticketNumber],
    ["Customer", ticket.customerName],
    ["Email", ticket.customerEmail],
    ["Plan", formatLabel(ticket.plan)],
    ["Category", formatLabel(ticket.category)],
    ["Priority", formatLabel(ticket.priority)],
    ["Status", formatLabel(ticket.status)]
  ];

  return rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="
            padding:10px 12px;
            border-bottom:1px solid #ece8df;
            color:#81796d;
            font-size:12px;
            font-weight:700;
          ">
            ${escapeHtml(label)}
          </td>

          <td style="
            padding:10px 12px;
            border-bottom:1px solid #ece8df;
            color:#171717;
            font-size:12px;
            font-weight:700;
            text-align:right;
          ">
            ${escapeHtml(value)}
          </td>
        </tr>
      `
    )
    .join("");
}

function buildHtmlEmail(
  content: SupportEmailContent
) {
  const safeMessage = escapeHtml(
    getText(content.message, 5000)
  ).replace(/\n/g, "<br>");

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    >
    <title>
      ${escapeHtml(content.subject)}
    </title>
  </head>

  <body style="
    margin:0;
    padding:0;
    background:#f4f2ed;
    font-family:Arial,Helvetica,sans-serif;
    color:#171717;
  ">
    <div style="
      width:100%;
      padding:32px 12px;
      box-sizing:border-box;
    ">
      <div style="
        max-width:640px;
        margin:0 auto;
        overflow:hidden;
        border:1px solid #e3ded4;
        border-radius:20px;
        background:#ffffff;
        box-shadow:0 18px 50px rgba(0,0,0,0.08);
      ">
        <div style="
          padding:30px;
          background:
            linear-gradient(
              135deg,
              #111111,
              #211d16
            );
          color:#ffffff;
        ">
          <div style="
            margin-bottom:12px;
            color:#c8a45a;
            font-size:11px;
            font-weight:800;
            letter-spacing:1.4px;
            text-transform:uppercase;
          ">
            ${escapeHtml(content.eyebrow)}
          </div>

          <h1 style="
            margin:0 0 12px;
            color:#ffffff;
            font-size:28px;
            line-height:1.15;
          ">
            ${escapeHtml(content.title)}
          </h1>

          <p style="
            margin:0;
            color:rgba(255,255,255,0.72);
            font-size:14px;
            line-height:1.7;
          ">
            ${escapeHtml(content.introduction)}
          </p>
        </div>

        <div style="padding:26px 30px;">
          <table style="
            width:100%;
            margin:0 0 24px;
            border:1px solid #ece8df;
            border-radius:12px;
            border-collapse:separate;
            border-spacing:0;
            overflow:hidden;
          ">
            ${buildTicketRows(content.ticket)}
          </table>

          <div style="
            margin-bottom:24px;
            padding:18px;
            border-left:4px solid #c8a45a;
            border-radius:8px;
            background:#faf7ef;
          ">
            <div style="
              margin-bottom:8px;
              color:#876b30;
              font-size:10px;
              font-weight:800;
              letter-spacing:1px;
              text-transform:uppercase;
            ">
              ${escapeHtml(content.messageLabel)}
            </div>

            <div style="
              color:#48433c;
              font-size:14px;
              line-height:1.7;
              overflow-wrap:anywhere;
            ">
              ${safeMessage}
            </div>
          </div>

          <a
            href="${escapeHtml(content.buttonUrl)}"
            style="
              display:inline-block;
              padding:13px 20px;
              border-radius:10px;
              background:#111111;
              color:#ffffff;
              font-size:13px;
              font-weight:800;
              text-decoration:none;
            "
          >
            ${escapeHtml(content.buttonLabel)}
          </a>

          <p style="
            margin:24px 0 0;
            color:#928a7f;
            font-size:11px;
            line-height:1.6;
          ">
            This notification was generated
            automatically by ClientPilot AI.
            Please use the secure support page to
            continue the ticket conversation.
          </p>
        </div>

        <div style="
          padding:16px 30px;
          border-top:1px solid #ece8df;
          background:#faf9f6;
          color:#8a8378;
          font-size:10px;
        ">
          ClientPilot AI by Makzora ·
          info@makzora.com
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim();
}

function buildTextEmail(
  content: SupportEmailContent
) {
  return [
    content.title,
    "",
    content.introduction,
    "",
    `Ticket: ${content.ticket.ticketNumber}`,
    `Customer: ${content.ticket.customerName}`,
    `Email: ${content.ticket.customerEmail}`,
    `Plan: ${formatLabel(content.ticket.plan)}`,
    `Category: ${formatLabel(
      content.ticket.category
    )}`,
    `Priority: ${formatLabel(
      content.ticket.priority
    )}`,
    `Status: ${formatLabel(
      content.ticket.status
    )}`,
    "",
    `${content.messageLabel}:`,
    getText(content.message, 5000),
    "",
    `${content.buttonLabel}:`,
    content.buttonUrl,
    "",
    "ClientPilot AI by Makzora",
    "info@makzora.com"
  ].join("\n");
}

async function sendSupportEmail(
  content: SupportEmailContent
) {
  const configuration =
    getConfiguration();

  if (!configuration) {
    console.warn(
      "Support email skipped because RESEND_API_KEY or SUPPORT_EMAIL_FROM is not configured."
    );

    return {
      sent: false,
      skipped: true
    };
  }

  try {
    const resend = new Resend(
      configuration.apiKey
    );

    const {
      data,
      error
    } = await resend.emails.send({
      from: configuration.from,
      to: content.to,
      replyTo: configuration.replyTo,
      subject: cleanHeader(content.subject),
      html: buildHtmlEmail(content),
      text: buildTextEmail(content)
    });

    if (error) {
      console.error(
        "Resend support email error:",
        error
      );

      return {
        sent: false,
        skipped: false,
        error: error.message
      };
    }

    return {
      sent: true,
      skipped: false,
      emailId: data?.id || null
    };
  } catch (error) {
    console.error(
      "Unable to send support email:",
      error
    );

    return {
      sent: false,
      skipped: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown email error"
    };
  }
}

export async function notifyOwnerOfNewTicket(
  ticket: SupportEmailTicket,
  message: string
) {
  const configuration =
    getConfiguration();

  if (!configuration) {
    return {
      sent: false,
      skipped: true
    };
  }

  const ticketUrl =
    `${configuration.appUrl}` +
    `/dashboard/owner/support/${ticket.id}`;

  return sendSupportEmail({
    to: configuration.inbox,

    subject:
      `[${formatLabel(ticket.priority)}] ` +
      `New support ticket ${ticket.ticketNumber}`,

    eyebrow:
      "New ClientPilot AI Support Issue",

    title:
      `New ticket ${ticket.ticketNumber}`,

    introduction:
      `${ticket.customerName} submitted a new support request that is ready for owner review.`,

    messageLabel:
      "Customer message",

    message,

    buttonLabel:
      "Open Ticket in Owner Dashboard",

    buttonUrl: ticketUrl,

    ticket
  });
}

export async function notifyOwnerOfClientReply(
  ticket: SupportEmailTicket,
  message: string
) {
  const configuration =
    getConfiguration();

  if (!configuration) {
    return {
      sent: false,
      skipped: true
    };
  }

  const ticketUrl =
    `${configuration.appUrl}` +
    `/dashboard/owner/support/${ticket.id}`;

  return sendSupportEmail({
    to: configuration.inbox,

    subject:
      `Customer replied to ${ticket.ticketNumber}`,

    eyebrow:
      "ClientPilot AI Support Reply",

    title:
      `${ticket.customerName} replied`,

    introduction:
      `A customer added new information to support ticket ${ticket.ticketNumber}.`,

    messageLabel:
      "Customer reply",

    message,

    buttonLabel:
      "Review Customer Reply",

    buttonUrl: ticketUrl,

    ticket
  });
}

export async function notifyClientOfOwnerReply(
  ticket: SupportEmailTicket,
  message: string
) {
  const configuration =
    getConfiguration();

  if (!configuration) {
    return {
      sent: false,
      skipped: true
    };
  }

  const ticketUrl =
    `${configuration.appUrl}` +
    `/dashboard/support/${ticket.id}`;

  return sendSupportEmail({
    to: ticket.customerEmail,

    subject:
      `Makzora replied to ${ticket.ticketNumber}`,

    eyebrow:
      "Makzora Customer Care",

    title:
      "You have a new support reply",

    introduction:
      `Makzora Support replied to your ClientPilot AI ticket ${ticket.ticketNumber}.`,

    messageLabel:
      "Makzora reply",

    message,

    buttonLabel:
      "View and Reply to Ticket",

    buttonUrl: ticketUrl,

    ticket
  });
}
