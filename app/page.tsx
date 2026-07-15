import Link from "next/link";

import {
  LandingFeatureShowcase
} from "@/components/LandingFeatureShowcase";

import {
  PLANS
} from "@/lib/plans";

const automationSteps = [
  {
    title: "Meeting Notes",
    text: "Client conversation captured",
    time: "10:30 AM",
    icon: "MN"
  },
  {
    title: "AI Summary",
    text: "Key points extracted",
    time: "10:31 AM",
    icon: "AI"
  },
  {
    title: "Tasks Created",
    text: "5 tasks added automatically",
    time: "10:31 AM",
    icon: "TC"
  },
  {
    title: "Reminder Scheduled",
    text: "Follow-up set for tomorrow",
    time: "10:32 AM",
    icon: "RS"
  },
  {
    title: "Proposal Ready",
    text: "Professional proposal prepared",
    time: "10:35 AM",
    icon: "PR"
  }
];

const features = [
  {
    icon: "TX",
    title: "AI Audio Transcription",
    text: "Upload recorded meetings and turn client conversations into searchable transcripts."
  },
  {
    icon: "AI",
    title: "AI Meeting Summaries",
    text: "Extract client needs, decisions, objections and clear next steps automatically."
  },
  {
    icon: "TK",
    title: "Automatic Task Extraction",
    text: "Important actions become organized tasks so nothing is forgotten."
  },
  {
    icon: "EM",
    title: "AI Follow-Up Emails",
    text: "Generate professional follow-up emails based on the real meeting conversation."
  },
  {
    icon: "PR",
    title: "AI Proposal Generator",
    text: "Create personalized proposal drafts using the client conversation and requirements."
  },
  {
    icon: "PDF",
    title: "PDF Proposal Export",
    text: "Download polished client-ready proposals and share them professionally."
  },
  {
    icon: "CT",
    title: "Client Timeline",
    text: "See meetings, tasks, reminders, proposals and follow-ups in one activity history."
  },
  {
    icon: "PL",
    title: "Smart Pipeline",
    text: "Track every lead from first conversation through proposal, follow-up and closing."
  },
  {
    icon: "SA",
    title: "Sales Activity",
    text: "Monitor clients, meetings, tasks, reminders and proposals created by each sales user."
  },
  {
    icon: "ST",
    title: "Sales Team Workspace",
    text: "Create secure Staff ID and PIN accounts with role-based workspace access."
  },
  {
    icon: "SP",
    title: "Customer Support Center",
    text: "Clients can submit issues, track status and securely communicate with support."
  },
  {
    icon: "ML",
    title: "Mobile Workspace",
    text: "Manage your sales workflow from desktop, tablet or mobile with responsive navigation."
  }
];

const pricingPlans = [
  {
    ...PLANS.free,
    subtitle: "Start testing",
    popular: false,
    cta: "Start Free"
  },
  {
    ...PLANS.starter,
    subtitle: "For solo sellers",
    popular: false,
    cta: "Start Starter"
  },
  {
    ...PLANS.pro,
    subtitle: "For growing sales teams",
    popular: true,
    cta: "Start Pro"
  },
  {
    ...PLANS.agency,
    subtitle: "For agencies and teams",
    popular: false,
    cta: "Start Agency"
  }
];
export default function HomePage() {
  return (
    <main className="cp-landing" id="top">
      <header className="cp-nav">
        <Link href="/" className="cp-brand">
          <span className="cp-brand-mark">CP</span>
          <span>ClientPilot AI</span>
        </Link>

        <nav className="cp-nav-links">
          <a href="#automation">Automation</a>
          <a href="#command-center">Command Center</a>
          <a href="#agency">Agency Mode</a>
          <a href="#pricing">Pricing</a>
          <a href="https://www.makzora.com">Makzora</a>
        </nav>

        <div className="cp-nav-actions">
          <Link href="/login" className="cp-login-btn">Login</Link>
          <Link href="/login" className="cp-primary-btn">Start Free</Link>
        </div>
      </header>

      <section className="cp-hero">
        <div className="cp-hero-copy">
          <span className="cp-pill">AI-powered sales automation</span>

          <h1>
            Turn every client conversation into <span>action.</span>
          </h1>

          <p>
            ClientPilot AI turns meetings into summaries, tasks, reminders,
            proposals, and sales activity visibility so your team saves hours
            of manual work and closes more deals.
          </p>

          <div className="cp-hero-buttons">
            <Link href="/login" className="cp-primary-btn cp-large-btn">Start Free</Link>
            <a href="#automation" className="cp-secondary-btn cp-large-btn">See Automation</a>
          </div>

          <div className="cp-trust-row">
            <div><b>No card</b><span>required</span></div>
            <div><b>2 min</b><span>setup</span></div>
            <div><b>Private</b><span>workspace</span></div>
            <div><b>Team</b><span>ready</span></div>
          </div>
        </div>

        <div className="cp-hero-visual" aria-label="Automation workflow visual">
          <div className="cp-orbit-line" />
          {automationSteps.map((step, index) => (
            <article className={`cp-flow-card cp-flow-${index + 1}`} key={step.title}>
              <div className="cp-flow-icon">{step.icon}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
              <span>{step.time}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="cp-strip" id="automation">
        <div className="cp-strip-card">
          <strong>Meeting notes</strong>
          <span>become clean summaries</span>
        </div>
        <div className="cp-strip-card">
          <strong>Decisions</strong>
          <span>become action tasks</span>
        </div>
        <div className="cp-strip-card">
          <strong>Follow-ups</strong>
          <span>become reminders</span>
        </div>
        <div className="cp-strip-card">
          <strong>Client needs</strong>
          <span>become proposals</span>
        </div>
      </section>

      <section className="cp-before-after">
        <div className="cp-section-heading">
          <span className="cp-pill">Manual work saved</span>
          <h2>Save hours. Close more.</h2>
          <p>Show your clients the difference between scattered manual work and a clean automated sales system.</p>
        </div>

        <div className="cp-compare-grid">
          <div className="cp-chaos-card">
            <h3>Without ClientPilot AI</h3>

            <div className="cp-sticky-board">
              <div className="cp-note note-yellow">Follow up with James</div>
              <div className="cp-note note-pink">Send proposal to Acme</div>
              <div className="cp-note note-green">Call Sarah</div>
              <div className="cp-spreadsheet">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>

            <ul>
              <li>Notes scattered</li>
              <li>Tasks forgotten</li>
              <li>Follow-ups missed</li>
              <li>Proposals delayed</li>
              <li>Deals slip away</li>
            </ul>
          </div>

          <div className="cp-arrow-circle">to</div>

          <div className="cp-clean-card">
            <h3>With ClientPilot AI</h3>

            <div className="cp-auto-stack">
              <div><b>AI Summary</b><span>Key decisions and next steps</span></div>
              <div><b>Tasks Created</b><span>Assigned automatically</span></div>
              <div><b>Reminder Set</b><span>Follow-up scheduled</span></div>
              <div><b>Proposal Ready</b><span>Draft prepared</span></div>
            </div>

            <div className="cp-growth-card">
              <b>All organized. Nothing missed.</b>
              <span>Everything in one place</span>
              <span>Follow-ups on time</span>
              <span>More deals won</span>
              <div className="cp-growth-line" />
            </div>
          </div>
        </div>
      </section>

      <section className="cp-command-section" id="command-center">
        <div className="cp-command-copy">
          <span className="cp-pill">Command center</span>
          <h2>All your sales. All in one intelligent dashboard.</h2>
          <p>
            See what matters today: hot leads, overdue follow-ups, proposal
            queue, meetings, and the next best action.
          </p>

          <ul>
            <li>See daily priorities at a glance</li>
            <li>Never miss a follow-up</li>
            <li>Track team activity</li>
            <li>Rescue lost leads</li>
          </ul>
        </div>

        <div className="cp-dashboard-mock">
          <div className="cp-dashboard-sidebar">
            <span>CP</span>
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>

          <div className="cp-dashboard-main">
            <div className="cp-dashboard-head">
              <div>
                <h3>Good morning, Alex</h3>
                <p>Here is what needs your attention today.</p>
              </div>
              <span>May 12 - May 18</span>
            </div>

            <div className="cp-metric-grid">
              <div><span>Open Tasks</span><b>28</b><small>12% up</small></div>
              <div><span>Hot Leads</span><b>37</b><small>18% up</small></div>
              <div><span>Lost Lead Rescue</span><b>14</b><small>needs action</small></div>
              <div><span>Follow-Up Reminders</span><b>16</b><small>due this week</small></div>
              <div><span>Proposal Queue</span><b>8</b><small>awaiting review</small></div>
              <div><span>Sales Activity</span><b>92%</b><small>team score</small></div>
            </div>

            <div className="cp-dashboard-bottom">
              <div className="cp-meeting-list">
                <h4>Upcoming Meetings</h4>
                <p>Acme Corp Discovery Call <span>Today 11:00</span></p>
                <p>Beta Co Proposal Review <span>Today 2:30</span></p>
                <p>Gamma Inc Follow-up <span>Tomorrow 10:00</span></p>
              </div>

              <div className="cp-pipeline-card">
                <h4>Deals Pipeline</h4>
                <div className="cp-pipeline-bar">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="cp-pipeline-labels">
                  <small>New</small>
                  <small>Qualified</small>
                  <small>Proposal</small>
                  <small>Won</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFeatureShowcase />

      <section className="cp-features">
        <div className="cp-section-heading">
          <span className="cp-pill">12 powerful features</span>
          <h2>Everything needed to turn conversations into revenue.</h2>
          <p>
            One connected workspace for meetings,
            clients, tasks, follow-ups, proposals,
            support and sales teams.
          </p>
        </div>

        <div className="cp-feature-grid">
          {features.map((feature) => (
            <article key={feature.title} className="cp-feature-card">
              <div>{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cp-agency" id="agency">
        <div className="cp-agency-copy">
          <span className="cp-pill">Agency mode</span>
          <h2>Built for agencies. Designed for sales teams.</h2>
          <p>
            Owners can create sales users, give them Staff ID + PIN, and track
            clients, meetings, tasks, and reminders from one workspace.
          </p>
        </div>

        <div className="cp-agency-flow">
          {[
            ["1", "Owner Dashboard", "Complete business view"],
            ["2", "Create Sales User", "Add sales staff"],
            ["3", "Staff ID + PIN", "Secure login access"],
            ["4", "Sales Workspace", "Client work area"],
            ["5", "Owner Visibility", "Track team activity"]
          ].map((item) => (
            <article key={item[1]}>
              <span>{item[0]}</span>
              <h3>{item[1]}</h3>
              <p>{item[2]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cp-pricing" id="pricing">
        <div className="cp-section-heading">
          <span className="cp-pill">Simple pricing</span>
          <h2>Start free. Upgrade when your sales grow.</h2>
        </div>

        <div className="cp-pricing-grid">
          {pricingPlans.map((plan) => (
            <article className={`cp-price-card ${plan.popular ? "popular" : ""}`} key={plan.name}>
              {plan.popular ? <span className="cp-popular">Most Popular</span> : null}
              <div className="cp-price-feature-badges">
                <span>AI Transcription</span>
                <span>AI Follow-ups</span>
                <span>AI Proposals</span>
              </div>

              <h3>{plan.name}</h3>
              <p>{plan.subtitle}</p>
              <div className="cp-price">
                <strong>{plan.priceLabel}</strong>
                <span></span>
              </div>

              <ul>
                {plan.features.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <a
                  href={
                    plan.name === "Starter"
                      ? "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/43096221-9517-4b43-8b1c-741fef30d87f"
                      : plan.name === "Pro"
                        ? "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/379bf850-dce0-4e3c-a727-71e69ce1cf39"
                        : plan.name === "Agency"
                          ? "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/7d490de8-6878-44e1-ae4b-806776fe4a90"
                          : "/login"
                  }
                  className={
                    plan.popular
                      ? "cp-primary-btn"
                      : "cp-secondary-btn"
                  }
                  target={
                    plan.name === "Free"
                      ? undefined
                      : "_blank"
                  }
                  rel={
                    plan.name === "Free"
                      ? undefined
                      : "noopener noreferrer"
                  }
                >
                  {plan.cta}
                </a>
            </article>
          ))}
        </div>
      </section>

      <section className="cp-final-cta">
        <span className="cp-pill">Start today</span>
        <h2>Make your sales process feel effortless.</h2>
        <p>Let ClientPilot AI handle the busywork so you can focus on closing deals.</p>
        <Link href="/login" className="cp-primary-btn cp-large-btn">Start Free Today</Link>
      </section>


      
      <footer className="cp-makzora-footer">
        <div className="cp-makzora-footer-inner">
          <div className="cp-makzora-footer-brand">
            <img
              src="/clientpilotai/makzora-logo-official.png?v=official"
              alt="Makzora logo"
              className="cp-makzora-footer-logo-image"
            />

            <strong>Makzora</strong>

            <p>
              Build. Brand. Automate. Grow.
              One digital house for modern businesses.
            </p>
          </div>

          <div className="cp-makzora-footer-column">
            <strong>Company</strong>

            <a
              href="https://www.makzora.com"
              target="_blank"
              rel="noreferrer"
            >
              Home
            </a>

            <a
              href="https://www.makzora.com/#portfolio"
              target="_blank"
              rel="noreferrer"
            >
              Portfolio
            </a>

            <a
              href="#pricing"
            >
              Pricing
            </a>

            <Link href="/contact">
              Contact
            </Link>
          </div>

          <div className="cp-makzora-footer-column">
            <strong>Services</strong>

            <a
              href="https://www.makzora.com"
              target="_blank"
              rel="noreferrer"
            >
              Branding &amp; design
            </a>

            <a
              href="https://www.makzora.com"
              target="_blank"
              rel="noreferrer"
            >
              AI agents
            </a>

            <a
              href="#top"
              className="cp-footer-clientpilot-link"
            >
              ClientPilot AI
            </a>

            <a
              href="https://www.makzora.com"
              target="_blank"
              rel="noreferrer"
            >
              Academy
            </a>
          </div>

          <div className="cp-makzora-footer-column">
            <strong>Get started</strong>

            <a
              href="https://www.makzora.com"
              target="_blank"
              rel="noreferrer"
            >
              Book a consultation
            </a>

            <a href="mailto:info@makzora.com">
              info@makzora.com
            </a>

            <a
              href="https://www.makzora.com"
              target="_blank"
              rel="noreferrer"
            >
              Join training
            </a>
          </div>
        </div>

        <div className="cp-makzora-footer-bottom">
          <span>
            &copy;{String.fromCharCode(169)} 2026 Makzora. All rights reserved.
          </span>

          <span>
            Build. Brand. Automate. Grow.
          </span>
        </div>
      </footer>

    </main>
  );
}


