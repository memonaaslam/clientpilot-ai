import Link from "next/link";

type LegalSection = {
  title: string;
  body: string[];
};

type LegalPageProps = {
  title: string;
  intro: string;
  updated?: string;
  sections: LegalSection[];
};

export function LegalPage({ title, intro, updated = "July 2026", sections }: LegalPageProps) {
  return (
    <main className="legal-page">
      <section className="legal-shell">
        <Link href="/" className="legal-brand">
          ClientPilot<span>AI</span>
        </Link>

        <div className="legal-hero">
          <span className="badge">Legal</span>
          <h1>{title}</h1>
          <p>{intro}</p>
          <small>Last updated: {updated}</small>
        </div>

        <div className="legal-card">
          {sections.map((section) => (
            <section key={section.title} className="legal-section">
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>

        <div className="legal-footer-links">
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/refund-policy">Refund Policy</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/login">Login</Link>
        </div>
      </section>
    </main>
  );
}