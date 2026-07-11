import Link from "next/link";

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
    icon: "MM",
    title: "Smart Meeting Memory",
    text: "Turn raw client notes into clean summaries, decisions, and next steps."
  },
  {
    icon: "AT",
    title: "Auto Tasks",
    text: "ClientPilot creates action items so your team does not forget important work."
  },
  {
    icon: "FR",
    title: "Follow-Up Reminders",
    text: "Schedule reminders for calls, proposals, payments, and WhatsApp follow-ups."
  },
  {
    icon: "PG",
    title: "Proposal Generator",
    text: "Create professional proposal drafts faster instead of starting from zero."
  },
  {
    icon: "SL",
    title: "Sales Staff Login",
    text: "Give each sales person a secure Staff ID and PIN workspace."
  },
  {
    icon: "LR",
    title: "Lost Lead Rescue",
    text: "Surface cold leads before they disappear and bring them back into action."
  }
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    subtitle: "Start testing",
    features: ["5 smart meetings/month", "1 user", "Basic reminders", "Proposal drafts"],
    cta: "Start Free"
  },
  {
    name: "Starter",
    price: "$19",
    subtitle: "For solo sellers",
    features: ["20 smart meetings/month", "1 user", "Client dashboard", "Follow-up reminders"],
    cta: "Start Starter"
  },
  {
    name: "Pro",
    price: "$39",
    subtitle: "For growing sales work",
    features: ["80 smart meetings/month", "1 user", "Advanced proposals", "Lost lead rescue"],
    cta: "Start Pro"
  },
  {
    name: "Agency",
    price: "$80",
    subtitle: "For agencies and teams",
    features: ["300 smart meetings/month", "Owner + 3 sales users", "Sales staff login", "Team activity tracking"],
    cta: "Start Agency",
    popular: true
  }
];

export default function HomePage() {
  return (
    <main className="cp-landing">
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

      <section className="cp-features">
        <div className="cp-section-heading">
          <span className="cp-pill">Powerful features</span>
          <h2>Automation your clients can understand instantly.</h2>
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
              <h3>{plan.name}</h3>
              <p>{plan.subtitle}</p>
              <div className="cp-price">
                <strong>{plan.price}</strong>
                <span>{plan.name === "Free" ? "" : "/month"}</span>
              </div>

              <ul>
                {plan.features.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <Link href="/login" className={plan.popular ? "cp-primary-btn" : "cp-secondary-btn"}>
                {plan.cta}
              </Link>
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
    </main>
  );
}


