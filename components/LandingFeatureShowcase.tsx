"use client";

import {
  useEffect,
  useState
} from "react";

const workflowSteps = [
  {
    icon: "AU",
    title: "Upload audio",
    text: "Add your recorded client meeting."
  },
  {
    icon: "TX",
    title: "AI transcription",
    text: "Audio becomes an accurate transcript."
  },
  {
    icon: "AI",
    title: "AI summary",
    text: "Decisions and needs are extracted."
  },
  {
    icon: "TK",
    title: "Tasks created",
    text: "Important actions become tasks."
  },
  {
    icon: "EM",
    title: "Follow-up email",
    text: "AI prepares a professional reply."
  },
  {
    icon: "PR",
    title: "Proposal ready",
    text: "A client proposal is generated."
  },
  {
    icon: "PDF",
    title: "PDF export",
    text: "Send or download a polished PDF."
  }
];

const transcriptLines = [
  "Client needs a social media management package.",
  "Budget range is approximately $500 per month.",
  "Weekly reports and WhatsApp updates are required.",
  "Proposal should be delivered before tomorrow."
];

export function LandingFeatureShowcase() {
  const [activeStep, setActiveStep] =
    useState(0);

  const [transcriptIndex, setTranscriptIndex] =
    useState(0);

  useEffect(() => {
    const workflowTimer = window.setInterval(
      () => {
        setActiveStep(
          (current) =>
            (current + 1) %
            workflowSteps.length
        );
      },
      1400
    );

    const transcriptTimer =
      window.setInterval(() => {
        setTranscriptIndex(
          (current) =>
            (current + 1) %
            transcriptLines.length
        );
      }, 1100);

    return () => {
      window.clearInterval(workflowTimer);
      window.clearInterval(
        transcriptTimer
      );
    };
  }, []);

  return (
    <>
      <section
        className="cp-workflow-showcase"
        id="ai-workflow"
      >
        <div className="cp-section-heading">
          <span className="cp-pill">
            Complete AI workflow
          </span>

          <h2>
            From recorded meeting to finished
            proposal.
          </h2>

          <p>
            ClientPilot AI completes the work
            normally spread across notes,
            documents, calendars and email tools.
          </p>
        </div>

        <div className="cp-workflow-track">
          {workflowSteps.map(
            (step, index) => (
              <article
                key={step.title}
                className={
                  index === activeStep
                    ? "active"
                    : index < activeStep
                      ? "complete"
                      : ""
                }
              >
                <div className="cp-workflow-number">
                  {index < activeStep
                    ? "?"
                    : step.icon}
                </div>

                <div>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>

                {index <
                workflowSteps.length - 1 ? (
                  <span className="cp-workflow-connector" />
                ) : null}
              </article>
            )
          )}
        </div>
      </section>

      <section className="cp-product-visual-grid">
        <article className="cp-product-visual cp-audio-visual">
          <div className="cp-visual-heading">
            <span>AI Meeting Intelligence</span>
            <strong>Audio to action</strong>
          </div>

          <div className="cp-audio-player">
            <button
              type="button"
              aria-label="Audio demonstration"
            >
              ?
            </button>

            <div className="cp-waveform">
              {Array.from({
                length: 34
              }).map((_, index) => (
                <i
                  key={index}
                  style={{
                    height: `${
                      14 +
                      ((index * 17) % 36)
                    }px`
                  }}
                />
              ))}
            </div>

            <span>12:48</span>
          </div>

          <div className="cp-transcript-window">
            <div className="cp-transcript-toolbar">
              <span className="cp-live-dot" />
              AI transcription in progress
            </div>

            <div className="cp-transcript-lines">
              {transcriptLines.map(
                (line, index) => (
                  <p
                    key={line}
                    className={
                      index <= transcriptIndex
                        ? "visible"
                        : ""
                    }
                  >
                    <span>
                      {String(index + 1).padStart(
                        2,
                        "0"
                      )}
                    </span>

                    {line}
                  </p>
                )
              )}
            </div>
          </div>

          <div className="cp-visual-result">
            <span>Complete</span>
            <strong>
              Transcript, summary and tasks ready
            </strong>
          </div>
        </article>

        <article className="cp-product-visual cp-email-visual">
          <div className="cp-visual-heading">
            <span>AI Communication</span>
            <strong>Follow-up email generator</strong>
          </div>

          <div className="cp-email-window">
            <div className="cp-email-row">
              <span>To</span>
              <strong>
                client@company.com
              </strong>
            </div>

            <div className="cp-email-row">
              <span>Subject</span>
              <strong>
                Your proposal and next steps
              </strong>
            </div>

            <div className="cp-email-body">
              <p>Hello Sarah,</p>

              <p>
                Thank you for today&apos;s meeting.
                Based on your goals, I prepared a
                proposal with the recommended
                package, timeline and next steps.
              </p>

              <p>
                I&apos;ll follow up tomorrow morning.
              </p>

              <span className="cp-email-cursor" />
            </div>

            <div className="cp-email-actions">
              <button type="button">
                AI generated
              </button>

              <span>Ready to send</span>
            </div>
          </div>
        </article>

        <article className="cp-product-visual cp-proposal-visual">
          <div className="cp-visual-heading">
            <span>Professional Proposals</span>
            <strong>Proposal and PDF workflow</strong>
          </div>

          <div className="cp-proposal-document">
            <div className="cp-proposal-document-head">
              <span>CP</span>

              <div>
                <strong>
                  Social Media Growth Proposal
                </strong>

                <small>
                  Prepared for Acme Company
                </small>
              </div>
            </div>

            <div className="cp-document-line wide" />
            <div className="cp-document-line" />
            <div className="cp-document-line medium" />

            <div className="cp-document-package">
              <span>Recommended package</span>
              <strong>$500 / month</strong>
            </div>

            <div className="cp-document-checks">
              <span>? Strategy and planning</span>
              <span>? Content creation</span>
              <span>? Weekly reporting</span>
              <span>? WhatsApp support</span>
            </div>

            <button type="button">
              PDF Ready
            </button>
          </div>
        </article>

        <article className="cp-product-visual cp-support-visual">
          <div className="cp-visual-heading">
            <span>Customer Support Center</span>
            <strong>Every issue stays organized</strong>
          </div>

          <div className="cp-support-flow">
            <div className="cp-support-message client">
              <span>Customer</span>
              <p>
                My subscription is not updating.
              </p>
            </div>

            <div className="cp-support-status-line">
              <span>CP-SUP-000127</span>
              <strong>Owner notified by email</strong>
            </div>

            <div className="cp-support-message owner">
              <span>ClientPilot Support</span>
              <p>
                We&apos;ve checked your payment and
                updated the account.
              </p>
            </div>

            <div className="cp-support-resolved">
              <span>?</span>
              Issue resolved
            </div>
          </div>
        </article>
      </section>

      <section className="cp-team-showcase">
        <div className="cp-team-copy">
          <span className="cp-pill">
            Sales team workspace
          </span>

          <h2>
            Owners stay informed while every sales
            user stays productive.
          </h2>

          <p>
            Create secure sales accounts, assign
            work and monitor meetings, clients,
            tasks, proposals and follow-ups.
          </p>

          <div className="cp-team-benefits">
            <span>Staff ID + secure PIN</span>
            <span>Role-based workspace</span>
            <span>Sales activity tracking</span>
            <span>Team performance visibility</span>
          </div>
        </div>

        <div className="cp-team-dashboard">
          <div className="cp-team-dashboard-top">
            <div>
              <small>Sales Activity</small>
              <strong>Team Overview</strong>
            </div>

            <span>Live</span>
          </div>

          {[
            ["AS", "Ayesha Saleem", "92%", "12 meetings"],
            ["UM", "Usman Malik", "86%", "9 meetings"],
            ["SK", "Sarah Khan", "78%", "7 meetings"]
          ].map((member, index) => (
            <article key={member[1]}>
              <span>{member[0]}</span>

              <div>
                <strong>{member[1]}</strong>
                <small>{member[3]}</small>
              </div>

              <div className="cp-team-progress">
                <i
                  style={{
                    width: member[2]
                  }}
                />

                <small>{member[2]}</small>
              </div>

              <em>
                {index === 0
                  ? "Top performer"
                  : "Active"}
              </em>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
