"use client";

import { useEffect, useMemo, useState } from "react";

const rawLines = [
  "Client said they need a proposal for social media management...",
  "Budget maybe around $500/month, but they asked for options.",
  "They want weekly reports, WhatsApp follow-up, and fast onboarding.",
  "Need to send proposal today and follow up tomorrow morning."
];

const polishedSteps = [
  "AI Summary",
  "Client needs a monthly social media management plan with clear deliverables, weekly reporting, WhatsApp follow-up, and fast onboarding.",
  "Suggested Proposal",
  "Starter plan: content calendar, post design, captions, reporting, and monthly optimization.",
  "Follow-up Task",
  "Send proposal today and schedule follow-up tomorrow morning."
];

export function AnimatedProductDemo() {
  const [rawIndex, setRawIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const rawText = useMemo(() => rawLines.slice(0, rawIndex + 1), [rawIndex]);
  const polishedText = useMemo(() => polishedSteps.slice(0, stepIndex + 1), [stepIndex]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRawIndex((current) => (current + 1) % rawLines.length);
      setStepIndex((current) => (current + 1) % polishedSteps.length);
    }, 1200);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="cp-demo-panel">
      <div className="cp-demo-glow" />

      <div className="cp-demo-toolbar">
        <span />
        <span />
        <span />
        <strong>Live AI Meeting Flow</strong>
      </div>

      <div className="cp-demo-grid">
        <div className="cp-demo-card">
          <div className="cp-demo-label">
            <span className="record-dot" />
            Raw Meeting Notes
          </div>

          <div className="typing-box raw">
            {rawText.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <i className="cursor-blink" />
          </div>
        </div>

        <div className="cp-demo-arrow">â†’</div>

        <div className="cp-demo-card polished">
          <div className="cp-demo-label">
            <span className="ai-dot" />
            ClientPilot AI Output
          </div>

          <div className="typing-box">
            {polishedText.map((line, index) =>
              index % 2 === 0 ? (
                <h4 key={line}>{line}</h4>
              ) : (
                <p key={line}>{line}</p>
              )
            )}
            <i className="cursor-blink" />
          </div>
        </div>
      </div>

      <div className="cp-demo-footer">
        <div>
          <strong>1 click</strong>
          <span>proposal</span>
        </div>
        <div>
          <strong>AI</strong>
          <span>summary</span>
        </div>
        <div>
          <strong>Auto</strong>
          <span>follow-up</span>
        </div>
      </div>
    </div>
  );
}