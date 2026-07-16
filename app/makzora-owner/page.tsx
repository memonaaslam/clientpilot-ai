import Link from "next/link";

import {
  MakzoraOwnerLayout
} from "@/components/MakzoraOwnerLayout";

import {
  OwnerAccessError,
  requireOwnerUser
} from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

export default async function MakzoraOwnerPage() {
  try {
    const owner = await requireOwnerUser();

    return (
      <MakzoraOwnerLayout>
        <div className="mk-owner-overview">
          <section className="mk-owner-hero">
            <div>
              <span>
                Private business workspace
              </span>

              <h1>
                Makzora Owner Dashboard
              </h1>

              <p>
                Manage every Makzora software
                product from one clear and
                completely separate owner
                workspace.
              </p>
            </div>

            <div className="mk-owner-signed-in">
              <span>M</span>

              <div>
                <small>Signed in as owner</small>
                <strong>{owner.email}</strong>
              </div>
            </div>
          </section>

          <section className="mk-owner-summary">
            <article>
              <span>Active products</span>
              <strong>1</strong>
              <small>
                ClientPilot AI is active
              </small>
            </article>

            <article>
              <span>Future products</span>
              <strong>0</strong>
              <small>
                Add more software later
              </small>
            </article>

            <article>
              <span>Workspace status</span>
              <strong>Private</strong>
              <small>
                Owner access only
              </small>
            </article>
          </section>

          <section className="mk-owner-products">
            <div className="mk-owner-section-head">
              <div>
                <span>Products</span>
                <h2>
                  Makzora software portfolio
                </h2>
              </div>

              <p>
                Select a product to open its full
                revenue, profit, expenses, API
                usage, support and reports.
              </p>
            </div>

            <div className="mk-owner-product-grid">
              <article className="mk-owner-product-card active">
                <div className="mk-owner-product-top">
                  <img
                    src="/clientpilotai/clientpilot-ai-logo.png"
                    alt="ClientPilot AI"
                  />

                  <span>Active</span>
                </div>

                <h3>ClientPilot AI</h3>

                <p>
                  AI-powered CRM, meeting
                  transcription, follow-up
                  automation and proposal
                  workflow.
                </p>

                <div className="mk-owner-product-tags">
                  <span>Subscribers</span>
                  <span>Revenue</span>
                  <span>Profit</span>
                  <span>Expenses</span>
                  <span>API usage</span>
                  <span>Support</span>
                  <span>Reports</span>
                </div>

                <Link href="/makzora-owner/products/clientpilot-ai">
                  Open ClientPilot AI
                  <span>→</span>
                </Link>
              </article>

              <article className="mk-owner-product-card coming">
                <div className="mk-owner-add-icon">
                  +
                </div>

                <h3>Add another product</h3>

                <p>
                  Any future CRM, ERP, AI agent or
                  Makzora software will appear here
                  with its own isolated dashboard.
                </p>

                <button type="button" disabled>
                  Coming in Phase 3
                </button>
              </article>
            </div>
          </section>
        </div>
      </MakzoraOwnerLayout>
    );
  } catch (error) {
    const message =
      error instanceof OwnerAccessError
        ? error.message
        : "Unable to verify Makzora owner access.";

    return (
      <div className="mk-owner-denied">
        <span>PRIVATE</span>

        <h1>
          Makzora owner access required
        </h1>

        <p>{message}</p>

        <Link href="/makzora-owner/login">
          Go to Makzora Owner Login
        </Link>
      </div>
    );
  }
}
