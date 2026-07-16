import type { ReactNode } from "react";

import {
  MakzoraOwnerSidebar
} from "@/components/MakzoraOwnerSidebar";

import {
  createSupabaseServerClient
} from "@/lib/supabase-server";

export async function MakzoraOwnerLayout({
  children
}: {
  children: ReactNode;
}) {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="mk-owner-shell">
      <MakzoraOwnerSidebar
        ownerEmail={user?.email || null}
      />

      <main className="mk-owner-main">
        {children}
      </main>
    </div>
  );
}
