import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  decryptRefreshToken,
  findOrCreateBackupFolder,
  refreshGoogleAccessToken,
  uploadJsonBackup
} from "@/lib/google-drive";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

type ExportedTable = {
  table: string;
  records: Record<string, unknown>[];
  warning: string | null;
};

type DriveConnection = {
  id: string;
  user_id: string;
  encrypted_refresh_token: string;
  drive_folder_id: string | null;
  drive_folder_name: string | null;
};

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

async function exportTable(
  admin: SupabaseClient,
  tableName: string,
  userId: string,
  ownerColumn = "user_id"
): Promise<ExportedTable> {
  const { data, error } = await admin
    .from(tableName)
    .select("*")
    .eq(ownerColumn, userId);

  if (error) {
    return {
      table: tableName,
      records: [],
      warning: error.message
    };
  }

  return {
    table: tableName,
    records: (data || []) as Record<string, unknown>[],
    warning: null
  };
}

function removeSensitiveSalesFields(
  records: Record<string, unknown>[]
): Record<string, unknown>[] {
  return records.map((record) => {
    const safeRecord = { ...record };

    delete safeRecord.pin_hash;
    delete safeRecord.password_hash;
    delete safeRecord.reset_token;

    return safeRecord;
  });
}

export async function POST() {
  let backupJobId: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

    const admin = createSupabaseAdmin();

    const {
      data: connectionData,
      error: connectionError
    } = await admin
      .from("google_drive_connections")
      .select(
        "id,user_id,encrypted_refresh_token,drive_folder_id,drive_folder_name"
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (connectionError) {
      throw new Error(connectionError.message);
    }

    if (!connectionData) {
      return NextResponse.json(
        { error: "Google Drive is not connected." },
        { status: 400 }
      );
    }

    const connection = connectionData as DriveConnection;

    const { data: backupJob, error: jobError } = await admin
      .from("backup_jobs")
      .insert({
        user_id: user.id,
        connection_id: connection.id,
        backup_type: "manual",
        status: "running",
        started_at: new Date().toISOString()
      })
      .select("id")
      .single();

    if (jobError) {
      throw new Error(jobError.message);
    }

    backupJobId = String(backupJob.id);

    const refreshToken = decryptRefreshToken(
      connection.encrypted_refresh_token
    );

    const { accessToken, expiresIn } =
      await refreshGoogleAccessToken(refreshToken);

    const folderName =
      connection.drive_folder_name || "ClientPilot AI Backups";

    const folderId =
      connection.drive_folder_id ||
      (await findOrCreateBackupFolder(
        accessToken,
        folderName
      ));

    const exportedTables: ExportedTable[] = [];

    exportedTables.push(
      await exportTable(admin, "clients", user.id)
    );

    exportedTables.push(
      await exportTable(admin, "meetings", user.id)
    );

    exportedTables.push(
      await exportTable(admin, "tasks", user.id)
    );

    exportedTables.push(
      await exportTable(admin, "reminders", user.id)
    );

    exportedTables.push(
      await exportTable(admin, "proposals", user.id)
    );

    exportedTables.push(
      await exportTable(admin, "client_timeline", user.id)
    );

    exportedTables.push(
      await exportTable(admin, "business_settings", user.id)
    );

    exportedTables.push(
      await exportTable(admin, "subscriptions", user.id)
    );

    const salesUsersExport = await exportTable(
      admin,
      "sales_users",
      user.id,
      "owner_id"
    );

    salesUsersExport.records = removeSensitiveSalesFields(
      salesUsersExport.records
    );

    exportedTables.push(salesUsersExport);

    const recordCount = exportedTables.reduce(
      (total, item) => total + item.records.length,
      0
    );

    const now = new Date();

    const timestamp = now
      .toISOString()
      .replace(/[:.]/g, "-");

    const fileName = `clientpilot-backup-${timestamp}.json`;

    const backupPayload = {
      backup_format: "clientpilot-ai-json-v1",
      generated_at: now.toISOString(),
      user: {
        id: user.id,
        email: user.email || null
      },
      source: {
        application: "ClientPilot AI",
        company: "Makzora"
      },
      record_count: recordCount,
      warnings: exportedTables
        .filter((item) => item.warning)
        .map((item) => ({
          table: item.table,
          warning: item.warning
        })),
      data: Object.fromEntries(
        exportedTables.map((item) => [
          item.table,
          item.records
        ])
      )
    };

    const uploaded = await uploadJsonBackup(
      accessToken,
      folderId,
      fileName,
      backupPayload
    );

    const completedAt = new Date().toISOString();

    const { error: connectionUpdateError } = await admin
      .from("google_drive_connections")
      .update({
        drive_folder_id: folderId,
        last_backup_at: completedAt,
        access_token_expires_at: new Date(
          Date.now() + expiresIn * 1000
        ).toISOString(),
        updated_at: completedAt
      })
      .eq("id", connection.id);

    if (connectionUpdateError) {
      throw new Error(connectionUpdateError.message);
    }

    const { error: jobUpdateError } = await admin
      .from("backup_jobs")
      .update({
        status: "completed",
        drive_file_id: uploaded.fileId,
        drive_file_name: uploaded.fileName,
        file_size_bytes: uploaded.sizeBytes,
        records_exported: recordCount,
        completed_at: completedAt,
        error_message: null
      })
      .eq("id", backupJobId);

    if (jobUpdateError) {
      throw new Error(jobUpdateError.message);
    }

    return NextResponse.json({
      success: true,
      fileName: uploaded.fileName,
      recordsExported: recordCount
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Google Drive backup failed.";

    if (backupJobId) {
      try {
        const admin = createSupabaseAdmin();

        await admin
          .from("backup_jobs")
          .update({
            status: "failed",
            error_message: message,
            completed_at: new Date().toISOString()
          })
          .eq("id", backupJobId);
      } catch {
        // Avoid hiding the original backup error.
      }
    }

    console.error("Google Drive backup error:", error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}