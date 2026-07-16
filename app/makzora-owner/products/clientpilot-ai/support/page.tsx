import Link from "next/link";

import { MakzoraOwnerLayout } from "@/components/MakzoraOwnerLayout";

import {
  OwnerSupportInbox
} from "@/components/OwnerSupportInbox";

import {
  OwnerAccessError,
  requireOwnerUser
} from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

export default async function OwnerSupportPage() {
  try {
    const owner = await requireOwnerUser();

    return (
      <MakzoraOwnerLayout>
        <OwnerSupportInbox
          ownerEmail={
            owner.email || "Makzora Owner"
          }
        />
      </MakzoraOwnerLayout>
    );
  } catch (error) {
    const message =
      error instanceof OwnerAccessError
        ? error.message
        : "Unable to verify Owner Support access.";

    return (
      <MakzoraOwnerLayout>
        <div className="cp-owner-restricted">
          <span>PRIVATE</span>

          <h1>Owner access required</h1>

          <p>{message}</p>

          <Link href="/dashboard">
            Return to Dashboard
          </Link>
        </div>
      </MakzoraOwnerLayout>
    );
  }
}
