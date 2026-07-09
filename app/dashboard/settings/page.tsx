import { SettingsLogoutPanel } from "@/components/SettingsLogoutPanel";
import { DashboardShell } from "@/components/DashboardShell";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase admin credentials are missing.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false
    }
  });
}

async function saveSettings(formData: FormData) {
  "use server";

  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please login first.");
  }

  let logoUrl = String(formData.get("existing_logo_url") || "");
  let logoPath = String(formData.get("existing_logo_path") || "");

  const logoFile = formData.get("logo_file");

  if (
    logoFile &&
    typeof logoFile === "object" &&
    "size" in logoFile &&
    Number(logoFile.size) > 0
  ) {
    const file = logoFile as File;

    if (!file.type.startsWith("image/")) {
      throw new Error("Please upload a valid image logo.");
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error("Logo must be smaller than 2 MB.");
    }

    const admin = createSupabaseAdmin();
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const filePath = `${user.id}/logo-${Date.now()}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage
      .from("business-assets")
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = admin.storage
      .from("business-assets")
      .getPublicUrl(filePath);

    logoUrl = data.publicUrl;
    logoPath = filePath;
  }

  await supabase.from("business_settings").upsert(
    {
      user_id: user.id,
      business_name: String(formData.get("business_name") || ""),
      logo_text: String(formData.get("logo_text") || ""),
      logo_url: logoUrl,
      logo_path: logoPath,
      currency: String(formData.get("currency") || "AED"),
      whatsapp_signature: "",
      email_signature: "",
      proposal_footer: "",
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/proposals");
  revalidatePath("/dashboard/proposal-pdf");
}

const currencies = [
  "AED",
  "USD",
  "GBP",
  "EUR",
  "PKR",
  "SAR",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "INR",
  "CAD",
  "AUD"
];

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: settings } = user
    ? await supabase
        .from("business_settings")
        .select("business_name,logo_text,logo_url,logo_path,currency")
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
            Add your company logo, business name, role/title, and currency for branded proposals.
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
              placeholder="Business name, e.g. Memona Aslam"
              defaultValue={settings?.business_name || ""}
            />

            <input
              className="input"
              name="logo_text"
              placeholder="Role / title, e.g. Software developer"
              defaultValue={settings?.logo_text || ""}
            />

            <input
              className="input"
              type="file"
              name="logo_file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
            />

            <input type="hidden" name="existing_logo_url" defaultValue={settings?.logo_url || ""} />
            <input type="hidden" name="existing_logo_path" defaultValue={settings?.logo_path || ""} />

            <p className="file-note">Upload PNG, JPG, WEBP, or SVG. Max size: 2 MB.</p>

            <select className="input" name="currency" defaultValue={settings?.currency || "AED"}>
              {currencies.map((currency) => (
                <option value={currency} key={currency}>
                  {currency}
                </option>
              ))}
            </select>

            <button className="btn gold" type="submit">
              Save Settings
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Brand Preview</h3>

          <div className="settings-preview">
            {settings?.logo_url ? (
              <img className="logo-preview" src={settings.logo_url} alt="Business logo" />
            ) : null}

            <div className="preview-logo">
              {settings?.logo_text || "Software developer"}
            </div>

            <p className="muted">
              <strong>Business:</strong> {settings?.business_name || "Memona Aslam"}
              <br />
              <strong>Currency:</strong> {settings?.currency || "AED"}
            </p>
          </div>
        </div>
      </div>

      <SettingsLogoutPanel />
    </DashboardShell>
  );
}
