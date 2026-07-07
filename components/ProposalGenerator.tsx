"use client";

import { useMemo, useState } from "react";

type ProposalGeneratorProps = {
  clientId: string;
  meetingId: string;
  clientName: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  meetingTitle: string;
  summary?: string | null;
  businessName?: string | null;
  logoText?: string | null;
  currency?: string | null;
  whatsappSignature?: string | null;
  emailSignature?: string | null;
  proposalFooter?: string | null;
};

function clean(value?: string | null) {
  return value && value.trim() ? value.trim() : "Not specified";
}

function brandName(value?: string | null) {
  return value && value.trim() ? value.trim() : "ClientPilot AI";
}

function buildProposal(props: ProposalGeneratorProps) {
  const brand = brandName(props.businessName);
  const logo = props.logoText?.trim() || brand;
  const currency = props.currency || "AED";
  const whatsappSignature = props.whatsappSignature || `Regards, ${brand}`;
  const emailSignature = props.emailSignature || `Best regards,\n${brand}`;
  const footer =
    props.proposalFooter ||
    "This proposal is a draft and can be updated after final scope confirmation.";

  return `${logo}
PROPOSAL DRAFT

Prepared By: ${brand}
Client: ${props.clientName}
Company: ${clean(props.company)}
Phone: ${clean(props.phone)}
Email: ${clean(props.email)}
Meeting: ${props.meetingTitle}
Currency: ${currency}

PROJECT UNDERSTANDING
${props.summary || "The client requirement was discussed during the meeting. The next step is to prepare a formal proposal based on the client's needs, budget, and preferred timeline."}

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
Hi ${props.clientName}, thank you for your time. Based on our discussion, we have prepared a proposal draft covering your requirements and next steps. Please review it and let us know if you would like us to proceed with the official quotation.

${whatsappSignature}

EMAIL SIGNATURE
${emailSignature}

FOOTER
${footer}`;
}

export function ProposalGenerator(props: ProposalGeneratorProps) {
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const proposal = useMemo(() => buildProposal(props), [props]);

  async function copyProposal() {
    try {
      await navigator.clipboard.writeText(proposal);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = proposal;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function saveProposal() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          clientId: props.clientId,
          meetingId: props.meetingId,
          title: `${props.clientName} - ${props.meetingTitle}`,
          content: proposal
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save proposal.");
      }

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save proposal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="proposal-card">
      <div className="section-head">
        <div>
          <h3>Proposal Generator</h3>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Turn this meeting into a branded client-ready proposal draft.
          </p>
        </div>

        <div className="proposal-actions">
          <button className="btn gold" type="button" onClick={() => setGenerated(true)}>
            Generate Proposal
          </button>

          {generated ? (
            <>
              <button className="btn secondary" type="button" onClick={copyProposal}>
                {copied ? "Copied" : "Copy Proposal"}
              </button>

              <button className="btn secondary" type="button" onClick={saveProposal} disabled={saving || saved}>
                {saving ? "Saving..." : saved ? "Saved" : "Save Proposal"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {error ? <p style={{ color: "#ffb4b4" }}>{error}</p> : null}
      {saved ? <p style={{ color: "var(--gold)" }}>Proposal saved successfully.</p> : null}

      {generated ? <pre className="proposal-output">{proposal}</pre> : null}
    </div>
  );
}