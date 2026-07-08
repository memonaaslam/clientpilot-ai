import Link from "next/link";
import { AnimatedProductDemo } from "@/components/AnimatedProductDemo";
import { LandingVisualShowcase } from "@/components/LandingVisualShowcase";

const features = [
  {
    title: "Lead Intelligence",
    body: "Automatically identify hot, warm, and cold opportunities so owners know which client needs attention first."
  },
  {
    title: "Smart Meeting Workflow",
    body: "Turn meeting notes into summaries, tasks, proposal points, and follow-up reminders without paid AI API cost."
  },
  {
    title: "Follow-Up Autopilot",
    body: "Create proposal, call, WhatsApp, email, and payment reminders with Google Calendar links."
  },
  {
    title: "Proposal Builder",
    body: "Create and edit professional proposals, then move old drafts to Recycle Bin safely."
  },
  {
    title: "Lost Lead Rescue",
    body: "Spot clients that have gone silent and bring them back with suggested follow-up actions."
  },
  {
    title: "Agency Team Ready",
    body: "Agency plan is designed for owner plus sales users, with future team tracking and unique staff access."
  }
];

const plans = [
  {
    name: "Free",
    price: "$0",
    body: "For testing your client workflow.",
    details: "5 smart meetings/month, 1 user, clients, tasks, reminders, and proposals.",
    link: "/login",
    button: "Start Free"
  },
  {
    name: "Starter",
    price: "$19/month",
    body: "For freelancers and solo service providers.",
    details: "20 smart meetings/month, client CRM, proposal builder, reminders, and calendar links.",
    link: "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/7d490de8-6878-44e1-ae4b-806776fe4a90",
    button: "Subscribe"
  },
  {
    name: "Pro",
    price: "$39/month",
    body: "For growing service businesses.",
    details: "80 smart meetings/month, lead scoring, lost lead rescue, and priority workflow.",
    link: "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/379bf850-dce0-4e3c-a727-71e69ce1cf39",
    button: "Subscribe"
  },
  {
    name: "Agency",
    price: "$80/month",
    body: "For agencies managing clients and sales follow-ups.",
    details: "300 smart meetings/month, owner workspace, 3 included sales users, and team-ready workflow.",
    link: "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/43096221-9517-4b43-8b1c-741fef30d87f",
    button: "Subscribe"
  }
];

export default function HomePage() {
  return (
    <main className="cp-landing">
      <nav className="cp-nav">
        <Link href="/" className="cp-logo cp-logo-pro">
          <span className="logo-symbol">ClientPilot</span>
          <b>AI</b>
        </Link>

        <div className="cp-nav-links">
          <a href="#features">Features</a>
          <a href="#demo">Demo</a>
          <a href="#pricing">Pricing</a>
          <Link href="/login">Login</Link>
        </div>

        <Link href="/login" className="cp-nav-cta">
          Get Started
        </Link>
      </nav>

      <section className="cp-hero" id="demo">
        <div className="cp-hero-copy">
          <span className="cp-eyebrow">Client follow-up autopilot</span>

          <h1>
            Never lose a client because of missed follow-up.
          </h1>

          <p>
            ClientPilot AI helps business owners capture meetings, create tasks, schedule reminders,
            generate proposals, and know exactly which client needs attention next.
          </p>

          <div className="cp-hero-actions">
            <Link href="/login" className="cp-primary-btn">
              Start Free
            </Link>

            <a href="#features" className="cp-secondary-btn">
              See Features
            </a>
          </div>

          <div className="cp-stats-row">
            <div>
              <strong>Free</strong>
              <span>Smart Mode</span>
            </div>
            <div>
              <strong>Auto</strong>
              <span>reminders</span>
            </div>
            <div>
              <strong>300</strong>
              <span>agency meetings</span>
            </div>
          </div>
        </div>

        <AnimatedProductDemo />
      </section>

      <section className="cp-logo-strip">
        <p>Built for freelancers, consultants, agencies, designers, marketers, and service businesses</p>
        <div className="cp-marquee">
          <div>
            <span>Lead Score</span>
            <span>Meetings</span>
            <span>Tasks</span>
            <span>Reminders</span>
            <span>Proposals</span>
            <span>Pipeline</span>
            <span>Lost Lead Rescue</span>
            <span>Team Ready</span>
          </div>
          <div>
            <span>Lead Score</span>
            <span>Meetings</span>
            <span>Tasks</span>
            <span>Reminders</span>
            <span>Proposals</span>
            <span>Pipeline</span>
            <span>Lost Lead Rescue</span>
            <span>Team Ready</span>
          </div>
        </div>
      </section>

      <LandingVisualShowcase />

      <section className="cp-section" id="features">
        <div className="cp-section-head">
          <span className="cp-eyebrow">Why owners need it</span>
          <h2>Less manual chasing. More closed clients.</h2>
          <p>
            Most service businesses lose money because follow-ups, proposals, and client actions are delayed.
            ClientPilot turns every meeting into an organized sales workflow.
          </p>
        </div>

        <div className="cp-feature-grid feature-grid-six">
          {features.map((feature) => (
            <article className="cp-feature-card" key={feature.title}>
              <span>{feature.title}</span>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cp-flow-section">
        <div className="cp-flow-card">
          <span className="cp-eyebrow">Workflow</span>
          <h2>From meeting notes to owner-level action plan.</h2>

          <div className="cp-flow-steps">
            <div>
              <strong>01</strong>
              <h3>Paste notes</h3>
              <p>Add client meeting notes after a call, WhatsApp chat, or sales discussion.</p>
            </div>

            <div>
              <strong>02</strong>
              <h3>Autopilot creates work</h3>
              <p>Get summary, tasks, proposal points, lead score, and follow-up reminders.</p>
            </div>

            <div>
              <strong>03</strong>
              <h3>Owner tracks everything</h3>
              <p>See pending follow-ups, missed actions, hot clients, and proposal status.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cp-section" id="pricing">
        <div className="cp-section-head">
          <span className="cp-eyebrow">Pricing</span>
          <h2>Simple pricing for solo sellers and agencies.</h2>
          <p>Start free, then upgrade when your client workflow grows.</p>
        </div>

        <div className="cp-pricing-grid">
          {plans.map((plan) => (
            <article className="cp-price-card" key={plan.name}>
              <h3>{plan.name}</h3>
              <strong>{plan.price}</strong>
              <p>{plan.body}</p>
              <small>{plan.details}</small>
              <a href={plan.link}>{plan.button}</a>
            </article>
          ))}
        </div>

        <div className="custom-team-box">
          <div>
            <span className="cp-eyebrow">Custom team add-on</span>
            <h3>Need more than 3 sales users?</h3>
            <p>
              Agency includes 3 sales users. Extra sales seats can be added later with a custom monthly add-on.
            </p>
          </div>
          <Link href="/contact" className="cp-secondary-btn">
            Request Custom Team
          </Link>
        </div>
      </section>

      <section className="cp-final-cta">
        <h2>Make your follow-up system automatic.</h2>
        <p>Start with one client, one meeting note, and one reminder. Then let ClientPilot keep your sales work organized.</p>
        <Link href="/login" className="cp-primary-btn">
          Open ClientPilot AI
        </Link>
      </section>

      <footer className="cp-footer">
        <Link href="/" className="cp-logo cp-logo-pro">
          <span className="logo-symbol">ClientPilot</span>
          <b>AI</b>
        </Link>

        <div>
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/refund-policy">Refunds</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </footer>
    </main>
  );
}