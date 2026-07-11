"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function SettingsLogoutPanel() {
  const router = useRouter();

  async function logout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <section className="settings-logout-card">
      <div>
        <span className="badge">Account</span>
        <h2>Logout</h2>
        <p className="muted">
          Sign out from this workspace securely.
        </p>
      </div>

      <button onClick={logout}>
        Logout
      </button>
    </section>
  );
}
