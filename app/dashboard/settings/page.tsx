import { DashboardShell } from "@/components/DashboardShell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

async function saveSettings(formData: FormData) {
  "use server";

  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please login first.");
  }

  await supabase.from("business_settings").upsert(
    {
      user_id: user.id,
      business_name: String(formData.get("business_name") || ""),
      logo_text: String(formData.get("logo_text") || ""),
      currency: String(formData.get("currency") || "AED"),
      whatsapp_signature: String(formData.get("whatsapp_signature") || ""),
      email_signature: String(formData.get("email_signature") || ""),
      proposal_footer: String(formData.get("proposal_footer") || ""),
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/proposals");
}

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: settings } = user
    ? await supabase
        .from("business_settings")
        .select("business_name,logo_text,currency,whatsapp_signature,email_signature,proposal_footer")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <DashboardShell>
      <div className="page-hero">
        <div>
          <span className="badge">White Label</span>
          <h1 style={{ fontSize: 46 }}>Business Settings</h1>
          <p className="muted">
            Add your business identity so proposals and follow-ups feel branded.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>AI</strong>
          <span>Brand setup</span>
        </div>
      </div>

      {!user ? (
        <div className="card">
          <p>Please login first from /login.</p>
        </div>
      ) : null}

      <div className="grid two">
        <div className="card">
          <h3>Business Profile</h3>

          <form className="form" action={saveSettings}>
            <input
              className="input"
              name="business_name"
              placeholder="Business name, e.g. Vogue Interiors"
              defaultValue={settings?.business_name || ""}
            />

            <input
              className="input"
              name="logo_text"
              placeholder="Logo text, e.g. VOGUE INTERIORS"
              defaultValue={settings?.logo_text || ""}
            />

            <select className="input" name="currency" defaultValue={settings?.currency || "AED"}>
              <option value="AED">AED</option>
              <option value="USD">USD</option>
              <option value="PKR">PKR</option>
              <option value="SAR">SAR</option>
              <option value="GBP">GBP</option>
            </select>

            <textarea
              className="textarea"
              name="whatsapp_signature"
              placeholder="WhatsApp signature, e.g. Regards, Vogue Interiors Team"
              defaultValue={settings?.whatsapp_signature || ""}
            />

            <textarea
              className="textarea"
              name="email_signature"
              placeholder="Email signature, e.g. Best regards, Vogue Interiors Team"
              defaultValue={settings?.email_signature || ""}
            />

            <textarea
              className="textarea"
              name="proposal_footer"
              placeholder="Proposal footer, e.g. This proposal is valid for 7 days."
              defaultValue={settings?.proposal_footer || ""}
            />

            <button className="btn gold" type="submit">
              Save Settings
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Brand Preview</h3>

          <div className="settings-preview">
            <div className="preview-logo">
              {settings?.logo_text || settings?.business_name || "YOUR BUSINESS"}
            </div>

            <p className="muted">
              <strong>Business:</strong> {settings?.business_name || "Not set"}
              <br />
              <strong>Currency:</strong> {settings?.currency || "AED"}
              <br />
              <strong>WhatsApp Signature:</strong>{" "}
              {settings?.whatsapp_signature || "Not set"}
              <br />
              <strong>Email Signature:</strong> {settings?.email_signature || "Not set"}
              <br />
              <strong>Proposal Footer:</strong> {settings?.proposal_footer || "Not set"}
            </p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}