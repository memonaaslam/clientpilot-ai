import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import { DashboardShell } from "@/components/DashboardShell";
import { SettingsLogoutPanel } from "@/components/SettingsLogoutPanel";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { GoogleDriveBackupButton } from "@/components/GoogleDriveBackupButton";

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase admin credentials are missing.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
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

  let logoUrl = String(
    formData.get("existing_logo_url") || ""
  );

  let logoPath = String(
    formData.get("existing_logo_path") || ""
  );

  const logoFile = formData.get("logo_file");

  if (
    logoFile &&
    typeof logoFile === "object" &&
    "size" in logoFile &&
    Number(logoFile.size) > 0
  ) {
    const file = logoFile as File;

    if (!file.type.startsWith("image/")) {
      throw new Error(
        "Please upload a valid image logo."
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error(
        "Logo must be smaller than 2 MB."
      );
    }

    const admin = createSupabaseAdmin();

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() || "png";

    const filePath = `${user.id}/logo-${Date.now()}.${extension}`;

    const arrayBuffer =
      await file.arrayBuffer();

    const { error: uploadError } =
      await admin.storage
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

  const { error } = await supabase
    .from("business_settings")
    .upsert(
      {
        user_id: user.id,
        business_name: String(
          formData.get("business_name") || ""
        ),
        logo_text: String(
          formData.get("logo_text") || ""
        ),
        logo_url: logoUrl,
        logo_path: logoPath,
        currency: String(
          formData.get("currency") || "AED"
        ),
        whatsapp_signature: "",
        email_signature: "",
        proposal_footer: "",
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "user_id"
      }
    );

  if (error) {
    throw new Error(error.message);
  }

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

function formatBackupDate(
  value?: string | null
) {
  if (!value) {
    return "No backup created yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No backup created yet";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

type SettingsPageProps = {
  searchParams: Promise<{
    drive_connected?: string;
    drive_error?: string;
  }>;
};

export default async function SettingsPage({
  searchParams
}: SettingsPageProps) {
  const query = await searchParams;

  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: settings } = user
    ? await supabase
        .from("business_settings")
        .select(
          "business_name,logo_text,logo_url,logo_path,currency"
        )
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: driveConnection } = user
    ? await supabase
        .from("google_drive_connections")
        .select(
          "google_email,is_active,last_backup_at,connected_at,drive_folder_name"
        )
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: backupJobs } = user
    ? await supabase
        .from("backup_jobs")
        .select(
          "id,backup_type,status,drive_file_name,records_exported,error_message,created_at,completed_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false
        })
        .limit(5)
    : { data: [] };

  const driveConnected =
    Boolean(driveConnection?.is_active);

  return (
    <DashboardShell>
      <div className="page-hero">
        <div>
          <span className="badge">
            Business & Backup
          </span>

          <h1 style={{ fontSize: 46 }}>
            Business Settings
          </h1>

          <p className="muted">
            Manage proposal branding, currency,
            and secure Google Drive backups.
          </p>
        </div>

        <div className="hero-mini-card">
          <strong>AI</strong>
          <span>Brand & backup</span>
        </div>
      </div>

      {!user ? (
        <div className="card">
          <p>
            Please login first from the login
            page.
          </p>
        </div>
      ) : null}

      {query.drive_connected === "true" ? (
        <div className="card">
          <p className="auth-message">
            Google Drive connected successfully.
          </p>
        </div>
      ) : null}

      {query.drive_error ? (
        <div className="card">
          <p className="auth-error">
            Google Drive connection failed:{" "}
            {query.drive_error}
          </p>
        </div>
      ) : null}

      <div className="grid two">
        <div className="card">
          <h3>Business Profile</h3>

          <form
            className="form"
            action={saveSettings}
          >
            <input
              className="input"
              name="business_name"
              placeholder="Business name"
              defaultValue={
                settings?.business_name || ""
              }
            />

            <input
              className="input"
              name="logo_text"
              placeholder="Role or title"
              defaultValue={
                settings?.logo_text || ""
              }
            />

            <input
              className="input"
              type="file"
              name="logo_file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
            />

            <input
              type="hidden"
              name="existing_logo_url"
              defaultValue={
                settings?.logo_url || ""
              }
            />

            <input
              type="hidden"
              name="existing_logo_path"
              defaultValue={
                settings?.logo_path || ""
              }
            />

            <p className="file-note">
              Upload PNG, JPG, WEBP, or SVG.
              Maximum size: 2 MB.
            </p>

            <select
              className="input"
              name="currency"
              defaultValue={
                settings?.currency || "AED"
              }
            >
              {currencies.map((currency) => (
                <option
                  value={currency}
                  key={currency}
                >
                  {currency}
                </option>
              ))}
            </select>

            <button
              className="btn gold"
              type="submit"
            >
              Save Settings
            </button>
          </form>
        </div>

        <div className="card">
          <h3>Brand Preview</h3>

          <div className="settings-preview">
            {settings?.logo_url ? (
              <img
                className="logo-preview"
                src={settings.logo_url}
                alt="Business logo"
              />
            ) : null}

            <div className="preview-logo">
              {settings?.logo_text ||
                "Software developer"}
            </div>

            <p className="muted">
              <strong>Business:</strong>{" "}
              {settings?.business_name ||
                "Memona Aslam"}
              <br />

              <strong>Currency:</strong>{" "}
              {settings?.currency || "AED"}
            </p>
          </div>
        </div>
      </div>

      <section
        className="card"
        style={{ marginTop: 24 }}
      >
        <div className="section-head">
          <div>
            <span className="badge">
              Google Drive Backup
            </span>

            <h2>Protect your ClientPilot data</h2>

            <p className="muted">
              Connect Google Drive to create
              secure manual and weekly backups
              of clients, meetings, proposals,
              reminders, tasks, and timeline
              activity.
            </p>
          </div>
        </div>

        {driveConnected ? (
          <div className="grid two">
            <div className="card">
              <span className="badge">
                Connected
              </span>

              <h3>
                {driveConnection?.google_email ||
                  "Google Drive"}
              </h3>

              <p className="muted">
                Backup folder:{" "}
                {driveConnection?.drive_folder_name ||
                  "ClientPilot AI Backups"}
              </p>

              <p className="muted">
                Last backup:{" "}
                {formatBackupDate(
                  driveConnection?.last_backup_at
                )}
              </p>

              <p className="muted">
                Weekly automatic backup will be
                enabled after the manual backup
                test succeeds.
              </p>
            </div>

            <div className="card">
              <h3>Backup actions</h3>

              <p className="muted">
                Google Drive is connected. The
                next step is adding the Back Up
                Now and Disconnect actions.
              </p>

              <GoogleDriveBackupButton />
            </div>
          </div>
        ) : (
          <div className="card">
            <h3>Google Drive is not connected</h3>

            <p className="muted">
              ClientPilot requests only the
              limited Drive permission required
              to create and manage its own backup
              files.
            </p>

            <Link
              className="btn gold"
              href="/api/google-drive/connect"
            >
              Connect Google Drive
            </Link>
          </div>
        )}
      </section>

      <section
        className="card"
        style={{ marginTop: 24 }}
      >
        <div className="section-head">
          <div>
            <span className="badge">
              Backup History
            </span>

            <h2>Recent backups</h2>
          </div>
        </div>

        {!backupJobs ||
        backupJobs.length === 0 ? (
          <div className="empty-state mini">
            <h3>No backups yet</h3>

            <p className="muted">
              Your backup history will appear
              here after the first manual backup.
            </p>
          </div>
        ) : (
          <div className="proposal-list">
            {backupJobs.map((job) => (
              <article
                className="proposal-row-card"
                key={job.id}
              >
                <div>
                  <span className="badge">
                    {job.status}
                  </span>

                  <h3>
                    {job.drive_file_name ||
                      "ClientPilot backup"}
                  </h3>

                  <p className="muted">
                    Type: {job.backup_type}
                    <br />
                    Records:{" "}
                    {job.records_exported || 0}
                    <br />
                    Created:{" "}
                    {formatBackupDate(
                      job.created_at
                    )}
                  </p>

                  {job.error_message ? (
                    <p className="auth-error">
                      {job.error_message}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <SettingsLogoutPanel />
    </DashboardShell>
  );
}