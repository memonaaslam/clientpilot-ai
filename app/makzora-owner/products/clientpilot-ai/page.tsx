import Link from "next/link";

import {
  MakzoraOwnerLayout
} from "@/components/MakzoraOwnerLayout";

import {
  OwnerDashboard
} from "@/components/OwnerDashboard";

import {
  OwnerAccessError,
  requireOwnerUser
} from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

export default async function ClientPilotOwnerPage() {
  try {
    const owner = await requireOwnerUser();

    return (
      <MakzoraOwnerLayout>
        <div className="mk-product-page">
          <section className="mk-product-header">
            <div className="mk-clientpilot-owner-logo">
              <img
                src="/clientpilotai/clientpilot-ai-logo.png"
                alt="ClientPilot AI"
              />
            </div>
            <div className="mk-product-header-logo">
              <img
                src="/clientpilotai/clientpilot-ai-logo.png"
                alt="ClientPilot AI"
              />
            </div>

            <div className="mk-product-header-copy">
              <span>Makzora Product</span>

              <h1>
                ClientPilot AI
              </h1>

              <p>
                Review ClientPilot AI subscribers,
                package sales, revenue, profit,
                investments, expenses, API usage,
                support activity and reports.
              </p>
            </div>

            <div className="mk-product-header-actions">
              <Link href="/makzora-owner">
                Back to Products
              </Link>

              <Link href="/dashboard">
                Open Client Workspace
              </Link>
            </div>
          </section>

          <OwnerDashboard
            ownerEmail={
              owner.email || "Makzora Owner"
            }
          />
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
