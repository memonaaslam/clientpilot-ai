"use client";

import { useEffect, useState } from "react";

const activity = [
  "New lead added: Azaan",
  "Smart meeting summary created",
  "Proposal reminder scheduled",
  "Hot lead detected: 82/100",
  "Follow-up due today",
  "Proposal moved to sent"
];

export function LandingVisualShowcase() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % activity.length);
    }, 1400);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="landing-visual-section">
      <div className="landing-visual-copy">
        <span className="cp-eyebrow">Visual workflow</span>
        <h2>Your client follow-up command center.</h2>
        <p>
          ClientPilot is designed to help business owners see what matters today:
          hot leads, pending proposals, overdue follow-ups, meeting summaries, and team activity.
        </p>

        <div className="landing-visual-points">
          <div>
            <strong>01</strong>
            <span>Capture client meeting notes</span>
          </div>
          <div>
            <strong>02</strong>
            <span>Generate smart summary and tasks</span>
          </div>
          <div>
            <strong>03</strong>
            <span>Schedule follow-up reminders</span>
          </div>
          <div>
            <strong>04</strong>
            <span>Track lead progress until closed</span>
          </div>
        </div>
      </div>

      <div className="software-visual-frame">
        <div className="software-topbar">
          <span />
          <span />
          <span />
          <strong>ClientPilot Workspace</strong>
        </div>

        <div className="software-grid">
          <div className="software-sidebar-mini">
            <b>ClientPilot AI</b>
            <i className="active">Dashboard</i>
            <i>Clients</i>
            <i>Meetings</i>
            <i>Reminders</i>
            <i>Proposals</i>
          </div>

          <div className="software-main-mini">
            <div className="software-stats-mini">
              <article>
                <span>Due Today</span>
                <strong>4</strong>
              </article>
              <article>
                <span>Hot Leads</span>
                <strong>7</strong>
              </article>
              <article>
                <span>Proposals</span>
                <strong>12</strong>
              </article>
            </div>

            <div className="software-workflow-mini">
              <div className="pipeline-col-mini">
                <h4>New Lead</h4>
                <div className={active === 0 ? "lead-card-mini pulse" : "lead-card-mini"}>
                  <strong>Azaan</strong>
                  <span>Needs proposal</span>
                </div>
              </div>

              <div className="pipeline-col-mini">
                <h4>Follow-Up</h4>
                <div className={active === 4 ? "lead-card-mini pulse" : "lead-card-mini"}>
                  <strong>Call client</strong>
                  <span>Today 5:00 PM</span>
                </div>
              </div>

              <div className="pipeline-col-mini">
                <h4>Proposal</h4>
                <div className={active === 5 ? "lead-card-mini pulse" : "lead-card-mini"}>
                  <strong>Sent</strong>
                  <span>Awaiting reply</span>
                </div>
              </div>
            </div>

            <div className="activity-feed-mini">
              <span className="live-dot" />
              <p>{activity[active]}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}