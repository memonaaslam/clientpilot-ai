import Link from "next/link";

import { MakzoraOwnerLayout } from "@/components/MakzoraOwnerLayout";

import {
  OwnerSupportTicket
} from "@/components/OwnerSupportTicket";

import {
  OwnerAccessError,
  requireOwnerUser
} from "@/lib/owner-auth";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OwnerSupportTicketPage({
  params
}: PageProps) {
  const {
    id
  } = await params;

  try {
    const owner = await requireOwnerUser();

    return (
      <MakzoraOwnerLayout>
        <OwnerSupportTicket
          ticketId={id}
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
