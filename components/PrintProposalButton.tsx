"use client";

type PrintProposalButtonProps = {
  title: string;
  content: string;
  brandName?: string | null;
  logoUrl?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function formatProposal(content: string) {
  const lines = content.split("\n");
  let html = "";

  for (const line of lines) {
    const cleanLine = line.trim();

    if (!cleanLine) {
      html += "<div class='space'></div>";
      continue;
    }

    const isHeading =
      cleanLine === cleanLine.toUpperCase() &&
      cleanLine.length > 3 &&
      cleanLine.length < 60 &&
      !cleanLine.startsWith("-") &&
      !cleanLine.match(/^\d+\./);

    if (isHeading) {
      html += `<h2>${escapeHtml(cleanLine)}</h2>`;
    } else if (cleanLine.startsWith("-") || cleanLine.match(/^\d+\./)) {
      html += `<p class='bullet'>${escapeHtml(cleanLine)}</p>`;
    } else {
      html += `<p>${escapeHtml(cleanLine)}</p>`;
    }
  }

  return html;
}

export function PrintProposalButton({
  title,
  content,
  brandName,
  logoUrl
}: PrintProposalButtonProps) {
  function printProposal() {
    const safeTitle = escapeHtml(title);
    const safeBrand = escapeHtml(brandName || "ClientPilot AI");
    const safeLogo = logoUrl ? escapeAttribute(logoUrl) : "";
    const proposalHtml = formatProposal(content);

    const printWindow = window.open("", "_blank", "width=900,height=1100");

    if (!printWindow) {
      alert("Please allow popups to print this proposal.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${safeTitle}</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 0;
              background: #f4f1ea;
              color: #17140f;
              font-family: Arial, sans-serif;
            }

            .page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 28mm 22mm;
              background: #fffdf8;
            }

            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #d7b46a;
              padding-bottom: 22px;
              margin-bottom: 28px;
            }

            .brand {
              display: flex;
              align-items: center;
              gap: 16px;
            }

            .logo {
              max-width: 96px;
              max-height: 64px;
              object-fit: contain;
            }

            .brand-mark {
              width: 54px;
              height: 54px;
              border-radius: 18px;
              background: #17140f;
              color: #d7b46a;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              letter-spacing: .08em;
            }

            .brand-name {
              font-size: 22px;
              font-weight: 900;
              letter-spacing: .08em;
              text-transform: uppercase;
            }

            .doc-type {
              text-align: right;
              color: #7c6a3c;
              font-weight: 800;
              letter-spacing: .14em;
              text-transform: uppercase;
              font-size: 12px;
            }

            h1 {
              font-size: 34px;
              line-height: 1.1;
              margin: 0 0 26px;
            }

            h2 {
              margin: 26px 0 10px;
              padding-top: 14px;
              border-top: 1px solid #eee2c4;
              color: #7c5b15;
              font-size: 15px;
              letter-spacing: .12em;
              text-transform: uppercase;
            }

            p {
              margin: 7px 0;
              line-height: 1.65;
              font-size: 14px;
            }

            .bullet {
              padding-left: 14px;
              border-left: 3px solid #d7b46a;
              margin: 7px 0;
            }

            .space {
              height: 6px;
            }

            .footer {
              margin-top: 40px;
              padding-top: 18px;
              border-top: 1px solid #eee2c4;
              font-size: 11px;
              color: #7b735f;
              display: flex;
              justify-content: space-between;
            }

            @media print {
              body {
                background: white;
              }

              .page {
                margin: 0;
                width: auto;
                min-height: auto;
                box-shadow: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="page">
            <div class="header">
              <div class="brand">
                ${
                  safeLogo
                    ? `<img class="logo" src="${safeLogo}" alt="${safeBrand}" />`
                    : `<div class="brand-mark">AI</div>`
                }

                <div>
                  <div class="brand-name">${safeBrand}</div>
                  <div style="font-size:12px;color:#7b735f;">Client Proposal</div>
                </div>
              </div>

              <div class="doc-type">Proposal Draft</div>
            </div>

            <h1>${safeTitle}</h1>

            <div class="content">
              ${proposalHtml}
            </div>

            <div class="footer">
              <span>${safeBrand}</span>
              <span>Generated by ClientPilot AI</span>
            </div>
          </div>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  return (
    <button className="btn secondary" type="button" onClick={printProposal}>
      Print / Save PDF
    </button>
  );
}