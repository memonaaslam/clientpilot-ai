import { NextRequest, NextResponse } from "next/server";
import {
  createClient,
  type SupabaseClient
} from "@supabase/supabase-js";

import {
  decryptRefreshToken,
  findOrCreateBackupFolder,
  refreshGoogleAccessToken,
  uploadJsonBackup
} from "@/lib/google-drive";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

type DriveConnection = {
  id: string;
  user_id: string;
  google_email: string | null;
  encrypted_refresh_token: string;
  drive_folder_id: string | null;
  drive_folder_name: string | null;
};

type ExportedTable = {
  table: string;
  records: Record<string, unknown>[];
  warning: string | null;
};

type BackupResult = {
  userId: string;
  googleEmail: string | null;
  success: boolean;
  fileName?: string;
  recordsExported?: number;
  error?: string;
};

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase admin credentials are missing."
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function verifyCronAuthorization(
  request: NextRequest
): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    throw new Error(
      "CRON_SECRET is not configured."
    );
  }

  const authorization =
    request.headers.get("authorization");

  return authorization === `Bearer ${cronSecret}`;
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
    records:
      (data || []) as Record<string, unknown>[],
    warning: null
  };
}

function removeSensitiveSalesFields(
  records: Record<string, unknown>[]
) {
  return records.map((record) => {
    const safeRecord = { ...record };

    delete safeRecord.pin_hash;
    delete safeRecord.password_hash;
    delete safeRecord.reset_token;

    return safeRecord;
  });
}

async function runBackupForConnection(
  admin: SupabaseClient,
  connection: DriveConnection
): Promise<BackupResult> {
  let backupJobId: string | null = null;

  try {
    const { data: backupJob, error: jobError } =
      await admin
        .from("backup_jobs")
        .insert({
          user_id: connection.user_id,
          connection_id: connection.id,
          backup_type: "weekly",
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

    const {
      accessToken,
      expiresIn
    } = await refreshGoogleAccessToken(
      refreshToken
    );

    const folderName =
      connection.drive_folder_name ||
      "ClientPilot AI Backups";

    const folderId =
      connection.drive_folder_id ||
      (await findOrCreateBackupFolder(
        accessToken,
        folderName
      ));

    const exportedTables: ExportedTable[] = [];

    exportedTables.push(
      await exportTable(
        admin,
        "clients",
        connection.user_id
      )
    );

    exportedTables.push(
      await exportTable(
        admin,
        "meetings",
        connection.user_id
      )
    );

    exportedTables.push(
      await exportTable(
        admin,
        "tasks",
        connection.user_id
      )
    );

    exportedTables.push(
      await exportTable(
        admin,
        "reminders",
        connection.user_id
      )
    );

    exportedTables.push(
      await exportTable(
        admin,
        "proposals",
        connection.user_id
      )
    );

    exportedTables.push(
      await exportTable(
        admin,
        "client_timeline",
        connection.user_id
      )
    );

    exportedTables.push(
      await exportTable(
        admin,
        "business_settings",
        connection.user_id
      )
    );

    exportedTables.push(
      await exportTable(
        admin,
        "subscriptions",
        connection.user_id
      )
    );

    const salesUsersExport = await exportTable(
      admin,
      "sales_users",
      connection.user_id,
      "owner_id"
    );

    salesUsersExport.records =
      removeSensitiveSalesFields(
        salesUsersExport.records
      );

    exportedTables.push(salesUsersExport);

    const recordsExported =
      exportedTables.reduce(
        (total, item) =>
          total + item.records.length,
        0
      );

    const now = new Date();

    const timestamp = now
      .toISOString()
      .replace(/[:.]/g, "-");

    const fileName =
      `clientpilot-weekly-backup-${timestamp}.json`;

    const backupPayload = {
      backup_format: "clientpilot-ai-json-v1",
      backup_type: "weekly",
      generated_at: now.toISOString(),

      user: {
        id: connection.user_id,
        google_backup_email:
          connection.google_email
      },

      source: {
        application: "ClientPilot AI",
        company: "Makzora"
      },

      record_count: recordsExported,

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

    const completedAt =
      new Date().toISOString();

    const {
      error: connectionUpdateError
    } = await admin
      .from("google_drive_connections")
      .update({
        drive_folder_id: folderId,
        last_backup_at: completedAt,
        access_token_expires_at:
          new Date(
            Date.now() + expiresIn * 1000
          ).toISOString(),
        updated_at: completedAt
      })
      .eq("id", connection.id);

    if (connectionUpdateError) {
      throw new Error(
        connectionUpdateError.message
      );
    }

    const { error: jobUpdateError } =
      await admin
        .from("backup_jobs")
        .update({
          status: "completed",
          drive_file_id: uploaded.fileId,
          drive_file_name: uploaded.fileName,
          file_size_bytes:
            uploaded.sizeBytes,
          records_exported:
            recordsExported,
          completed_at: completedAt,
          error_message: null
        })
        .eq("id", backupJobId);

    if (jobUpdateError) {
      throw new Error(
        jobUpdateError.message
      );
    }

    return {
      userId: connection.user_id,
      googleEmail: connection.google_email,
      success: true,
      fileName: uploaded.fileName,
      recordsExported
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Weekly backup failed.";

    if (backupJobId) {
      await admin
        .from("backup_jobs")
        .update({
          status: "failed",
          error_message: message,
          completed_at:
            new Date().toISOString()
        })
        .eq("id", backupJobId);
    }

    return {
      userId: connection.user_id,
      googleEmail: connection.google_email,
      success: false,
      error: message
    };
  }
}

export async function GET(
  request: NextRequest
) {
  try {
    if (!verifyCronAuthorization(request)) {
      return NextResponse.json(
        {
          error: "Unauthorized cron request."
        },
        { status: 401 }
      );
    }

    const admin = createSupabaseAdmin();

    const {
  data: connectionRows,
  error: connectionsError
} = await admin
  .from("google_drive_connections")
  .select(
    "id,user_id,google_email,encrypted_refresh_token,drive_folder_id,drive_folder_name"
  )
  .eq("is_active", true);

    if (connectionsError) {
      throw new Error(
        connectionsError.message
      );
    }

    const connections: DriveConnection[] =
  (connectionRows ?? []).map((row) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    google_email: row.google_email
      ? String(row.google_email)
      : null,
    encrypted_refresh_token: String(
      row.encrypted_refresh_token
    ),
    drive_folder_id: row.drive_folder_id
      ? String(row.drive_folder_id)
      : null,
    drive_folder_name: row.drive_folder_name
      ? String(row.drive_folder_name)
      : null
  }));

    if (connections.length === 0) {
      return NextResponse.json({
        success: true,
        message:
          "No active Google Drive connections.",
        totalUsers: 0,
        successful: 0,
        failed: 0,
        results: []
      });
    }

    /*
      Run sequentially to reduce API and database
      pressure when many user accounts are connected.
    */
    const results: BackupResult[] = [];

    for (const connection of connections) {
      const result =
        await runBackupForConnection(
          admin,
          connection
        );

      results.push(result);
    }

    const successful = results.filter(
      (result) => result.success
    ).length;

    const failed =
      results.length - successful;

    return NextResponse.json({
      success: failed === 0,
      totalUsers: results.length,
      successful,
      failed,
      completedAt:
        new Date().toISOString(),
      results
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Weekly backup cron failed.";

    console.error(
      "Weekly Google Drive backup cron error:",
      error
    );

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}