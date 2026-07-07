import Link from "next/link";

const features = [
  ["AI Meeting Memory", "Record or upload client conversations and keep every detail searchable."],
  ["Follow-Up Generator", "Create WhatsApp and email replies from every meeting summary."],
  ["Sales CRM", "Turn meetings into clients, tasks, reminders, proposals, and deal stages."],
  ["Team Dashboard", "Give managers a clean view of leads, pending follow-ups, and overdue tasks."],
  ["PDF/Export Ready", "Export summaries, proposal notes, and visit reports for clients."],
  ["Subscription SaaS", "Built with plans, checkout, and usage limits in mind from day one."]
];

export default function HomePage() {
  return (
    <>
      <nav className="container nav">
        <Link className="logo" href="/">ClientPilot<span>AI</span></Link>
        <div className="navlinks">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link href="/login">Login</Link>
          <Link href="/dashboard" className="btn gold">Open Dashboard</Link>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div className="badge">AI client follow-up CRM</div>
              <h1>Never forget a client conversation again.</h1>
              <p className="lead">
                ClientPilot AI records meetings, transcribes audio, creates summaries, writes follow-up messages,
                extracts tasks, and stores client memory forever.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
                <Link href="/login" className="btn gold">Start MVP</Link>
                <Link href="/dashboard/upload" className="btn secondary">Try Upload Flow</Link>
              </div>
            </div>
            <div className="card">
              <h3>Today&apos;s AI Brief</h3>
              <p className="muted">3 follow-ups due, 2 proposals pending, 1 client waiting for quotation.</p>
              <div className="grid" style={{ marginTop: 18 }}>
                <div className="kpi"><strong>12</strong><span className="muted">Client conversations stored</span></div>
                <div className="kpi"><strong>8</strong><span className="muted">AI tasks created</span></div>
                <div className="kpi"><strong>4</strong><span className="muted">Follow-ups ready to send</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section">
          <div className="container">
            <h2>Built for service businesses.</h2>
            <p className="lead">Interior design, AC maintenance, real estate, clinics, consultants, contractors, agencies, and snagging companies.</p>
            <div className="grid three" style={{ marginTop: 28 }}>
              {features.map(([title, body]) => (
                <div className="card" key={title}>
                  <h3>{title}</h3>
                  <p className="muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="section">
          <div className="container">
            <h2>Simple subscription plans.</h2>
            <div className="grid three" style={{ marginTop: 24 }}>
              {[
                ["Starter", "AED 49/mo", "30 recordings, AI summaries, client memory"],
                ["Business", "AED 149/mo", "Team dashboard, CRM, proposal drafts"],
                ["Agency", "AED 299/mo", "Advanced reports, branding, priority support"]
              ].map(([name, price, desc]) => (
                <div className="card" key={name}>
                  <h3>{name}</h3>
                  <h2>{price}</h2>
                  <p className="muted">{desc}</p>
                  <form action="/api/stripe/checkout" method="POST">
                    <input type="hidden" name="plan" value={name.toLowerCase()} />
                    <button className="btn gold" type="submit">Subscribe</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
