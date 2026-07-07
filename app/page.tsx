import Link from "next/link";
import { AnimatedProductDemo } from "@/components/AnimatedProductDemo";

const features = [
  {
    title: "Client Memory",
    body: "Keep every client conversation, meeting note, proposal, and follow-up in one organized workspace."
  },
  {
    title: "AI Meeting Summaries",
    body: "Turn messy notes or meeting recordings into clear summaries, action items, and next steps."
  },
  {
    title: "Proposal Generator",
    body: "Create branded proposals with your business name, logo, signature, and pricing."
  },
  {
    title: "Sales Pipeline",
    body: "Track leads from new inquiry to proposal, follow-up, won, or lost."
  }
];

const plans = [
  {
    name: "Starter",
    price: "$19/month",
    body: "For freelancers and solo service providers.",
    link: "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/7d490de8-6878-44e1-ae4b-806776fe4a90"
  },
  {
    name: "Pro",
    price: "$49/month",
    body: "For growing service businesses.",
    link: "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/379bf850-dce0-4e3c-a727-71e69ce1cf39"
  },
  {
    name: "Agency",
    price: "$99/month",
    body: "For teams and agencies managing more clients.",
    link: "https://clientpilot-ai.lemonsqueezy.com/checkout/buy/43096221-9517-4b43-8b1c-741fef30d87f"
  }
];

export default function HomePage() {
  return (
    <main className="cp-landing">
      <nav className="cp-nav">
        <Link href="/" className="cp-logo">
          ClientPilot<span>AI</span>
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
          <span className="cp-eyebrow">AI client follow-up system</span>

          <h1>
            Turn every client meeting into a proposal, task list, and follow-up.
          </h1>

          <p>
            ClientPilot AI helps service businesses capture meetings, remember client details,
            generate branded proposals, and move leads through a clean sales pipeline.
          </p>

          <div className="cp-hero-actions">
            <Link href="/login" className="cp-primary-btn">
              Start Free
            </Link>

            <a href="#features" className="cp-secondary-btn">
              See How It Works
            </a>
          </div>

          <div className="cp-stats-row">
            <div>
              <strong>AI</strong>
              <span>summaries</span>
            </div>
            <div>
              <strong>1-click</strong>
              <span>proposals</span>
            </div>
            <div>
              <strong>500</strong>
              <span>uploads/month</span>
            </div>
          </div>
        </div>

        <AnimatedProductDemo />
      </section>

      <section className="cp-logo-strip">
        <p>Built for freelancers, consultants, agencies, designers, marketers, and service teams</p>
        <div className="cp-marquee">
          <div>
            <span>CRM</span>
            <span>Meetings</span>
            <span>AI Summary</span>
            <span>Proposals</span>
            <span>Pipeline</span>
            <span>Follow-ups</span>
            <span>Tasks</span>
            <span>White Label</span>
          </div>
          <div>
            <span>CRM</span>
            <span>Meetings</span>
            <span>AI Summary</span>
            <span>Proposals</span>
            <span>Pipeline</span>
            <span>Follow-ups</span>
            <span>Tasks</span>
            <span>White Label</span>
          </div>
        </div>
      </section>

      <section className="cp-section" id="features">
        <div className="cp-section-head">
          <span className="cp-eyebrow">Product</span>
          <h2>One workspace for client conversations and sales follow-up.</h2>
          <p>
            Instead of losing client details in WhatsApp, notes, calls, and scattered files,
            ClientPilot AI keeps everything connected.
          </p>
        </div>

        <div className="cp-feature-grid">
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
          <h2>From meeting to money-making follow-up.</h2>

          <div className="cp-flow-steps">
            <div>
              <strong>01</strong>
              <h3>Upload or record</h3>
              <p>Add meeting notes or audio from your client conversation.</p>
            </div>

            <div>
              <strong>02</strong>
              <h3>AI organizes it</h3>
              <p>Get transcript, summary, next steps, and tasks automatically.</p>
            </div>

            <div>
              <strong>03</strong>
              <h3>Send proposal</h3>
              <p>Create a branded proposal and move the client through your pipeline.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cp-section" id="pricing">
        <div className="cp-section-head">
          <span className="cp-eyebrow">Pricing</span>
          <h2>Simple plans for solo sellers and agencies.</h2>
          <p>Start with the plan that matches your monthly meeting volume.</p>
        </div>

        <div className="cp-pricing-grid">
          {plans.map((plan) => (
            <article className="cp-price-card" key={plan.name}>
              <h3>{plan.name}</h3>
              <strong>{plan.price}</strong>
              <p>{plan.body}</p>
              <a href={plan.link}>Subscribe</a>
            </article>
          ))}
        </div>
      </section>

      <section className="cp-final-cta">
        <h2>Ready to make your client follow-up feel automatic?</h2>
        <p>Launch your workspace, add your first client, and let AI help you follow up faster.</p>
        <Link href="/login" className="cp-primary-btn">
          Open ClientPilot AI
        </Link>
      </section>

      <footer className="cp-footer">
        <Link href="/" className="cp-logo">
          ClientPilot<span>AI</span>
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