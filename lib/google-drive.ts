import crypto from "crypto";

const GOOGLE_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GOOGLE_USERINFO_URL =
  "https://openidconnect.googleapis.com/v1/userinfo";

const GOOGLE_DRIVE_FILES_URL =
  "https://www.googleapis.com/drive/v3/files";

const GOOGLE_DRIVE_UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files";

const DRIVE_SCOPE =
  "https://www.googleapis.com/auth/drive.file";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  DRIVE_SCOPE
] as const;

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
  id_token?: string;
};

type GoogleErrorResponse = {
  error?: string;
  error_description?: string;
  error_uri?: string;
};

type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

type GoogleDriveFileListResponse = {
  files?: Array<{
    id?: string;
    name?: string;
  }>;
  error?: {
    message?: string;
  };
};

type GoogleDriveFileResponse = {
  id?: string;
  name?: string;
  error?: {
    message?: string;
  };
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }

  return value;
}

async function readJsonResponse<T>(
  response: Response
): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(
      `Google returned an invalid response with status ${response.status}.`
    );
  }
}

function getGoogleErrorMessage(
  data: GoogleErrorResponse,
  fallback: string
): string {
  return (
    data.error_description ||
    data.error ||
    fallback
  );
}

export function createGoogleDriveAuthorizationUrl(
  state: string
): string {
  if (!state) {
    throw new Error(
      "Google OAuth state is required."
    );
  }

  const url = new URL(GOOGLE_AUTH_URL);

  url.searchParams.set(
    "client_id",
    requireEnv("GOOGLE_DRIVE_CLIENT_ID")
  );

  url.searchParams.set(
    "redirect_uri",
    requireEnv("GOOGLE_DRIVE_REDIRECT_URI")
  );

  url.searchParams.set(
    "response_type",
    "code"
  );

  url.searchParams.set(
    "scope",
    GOOGLE_SCOPES.join(" ")
  );

  /*
    Required for receiving a refresh token so weekly
    backups can run while the user is offline.
  */
  url.searchParams.set(
    "access_type",
    "offline"
  );

  /*
    Force Google to show the consent screen again.
    This is important when the previous token was
    created without Drive permission.
  */
  url.searchParams.set(
    "prompt",
    "consent select_account"
  );

  /*
    Request exactly the scopes listed above rather
    than silently relying on an older grant.
  */
  url.searchParams.set(
    "include_granted_scopes",
    "false"
  );

  url.searchParams.set(
    "state",
    state
  );

  return url.toString();
}

export async function exchangeGoogleCode(
  code: string
): Promise<GoogleTokenResponse> {
  if (!code) {
    throw new Error(
      "Google authorization code is missing."
    );
  }

  const response = await fetch(
    GOOGLE_TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        code,
        client_id: requireEnv(
          "GOOGLE_DRIVE_CLIENT_ID"
        ),
        client_secret: requireEnv(
          "GOOGLE_DRIVE_CLIENT_SECRET"
        ),
        redirect_uri: requireEnv(
          "GOOGLE_DRIVE_REDIRECT_URI"
        ),
        grant_type: "authorization_code"
      }),
      cache: "no-store"
    }
  );

  const data =
    await readJsonResponse<
      GoogleTokenResponse & GoogleErrorResponse
    >(response);

  if (!response.ok) {
    throw new Error(
      getGoogleErrorMessage(
        data,
        "Google token exchange failed."
      )
    );
  }

  if (!data.access_token) {
    throw new Error(
      "Google did not return an access token."
    );
  }

  if (data.scope) {
  assertDriveScopeGranted(data.scope);
}

  return data;
}

export function assertDriveScopeGranted(
  scopeValue?: string
): void {
  const grantedScopes = new Set(
    String(scopeValue || "")
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter(Boolean)
  );

  if (!grantedScopes.has(DRIVE_SCOPE)) {
    throw new Error(
      "Google Drive permission was not granted. Remove the existing Google connection, revoke ClientPilot AI from your Google account, then reconnect and approve Drive access."
    );
  }
}

export async function getGoogleUser(
  accessToken: string
): Promise<GoogleUserInfo> {
  if (!accessToken) {
    throw new Error(
      "Google access token is missing."
    );
  }

  const response = await fetch(
    GOOGLE_USERINFO_URL,
    {
      headers: {
        Authorization:
          `Bearer ${accessToken}`
      },
      cache: "no-store"
    }
  );

  const data =
    await readJsonResponse<
      GoogleUserInfo & GoogleErrorResponse
    >(response);

  if (!response.ok) {
    throw new Error(
      getGoogleErrorMessage(
        data,
        "Unable to read Google account."
      )
    );
  }

  return data;
}

function getEncryptionKey(): Buffer {
  const hexKey = requireEnv(
    "GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY"
  );

  if (!/^[a-fA-F0-9]{64}$/.test(hexKey)) {
    throw new Error(
      "GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters."
    );
  }

  return Buffer.from(hexKey, "hex");
}

export function encryptRefreshToken(
  refreshToken: string
): string {
  if (!refreshToken) {
    throw new Error(
      "Google refresh token is missing."
    );
  }

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(
      refreshToken,
      "utf8"
    ),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64")
  ].join(".");
}

export function decryptRefreshToken(
  encryptedValue: string
): string {
  const [
    ivPart,
    tagPart,
    encryptedPart
  ] = encryptedValue.split(".");

  if (
    !ivPart ||
    !tagPart ||
    !encryptedPart
  ) {
    throw new Error(
      "Stored Google refresh token has an invalid format."
    );
  }

  try {
    const decipher =
      crypto.createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(),
        Buffer.from(
          ivPart,
          "base64"
        )
      );

    decipher.setAuthTag(
      Buffer.from(
        tagPart,
        "base64"
      )
    );

    const decrypted = Buffer.concat([
      decipher.update(
        Buffer.from(
          encryptedPart,
          "base64"
        )
      ),
      decipher.final()
    ]);

    return decrypted.toString("utf8");
  } catch {
    throw new Error(
      "Unable to decrypt the stored Google refresh token."
    );
  }
}

export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<{
  accessToken: string;
  expiresIn: number;
  scope: string | null;
}> {
  if (!refreshToken) {
    throw new Error(
      "Google refresh token is missing."
    );
  }

  const response = await fetch(
    GOOGLE_TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: requireEnv(
          "GOOGLE_DRIVE_CLIENT_ID"
        ),
        client_secret: requireEnv(
          "GOOGLE_DRIVE_CLIENT_SECRET"
        ),
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      }),
      cache: "no-store"
    }
  );

  const data =
    await readJsonResponse<
      GoogleTokenResponse & GoogleErrorResponse
    >(response);

  if (!response.ok) {
    throw new Error(
      getGoogleErrorMessage(
        data,
        "Unable to refresh Google access token."
      )
    );
  }

  if (!data.access_token) {
    throw new Error(
      "Google did not return a refreshed access token."
    );
  }

  /*
    Google may omit scope during refresh. When it is
    present, validate that Drive permission remains.
  */
  if (data.scope) {
    assertDriveScopeGranted(
      data.scope
    );
  }

  return {
    accessToken:
      String(data.access_token),
    expiresIn:
      Number(data.expires_in || 3600),
    scope:
      data.scope || null
  };
}

function escapeDriveQueryValue(
  value: string
): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

export async function findOrCreateBackupFolder(
  accessToken: string,
  folderName: string
): Promise<string> {
  if (!accessToken) {
    throw new Error(
      "Google access token is missing."
    );
  }

  const safeFolderName =
    folderName.trim() ||
    "ClientPilot AI Backups";

  const query = [
    `name='${escapeDriveQueryValue(
      safeFolderName
    )}'`,
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false"
  ].join(" and ");

  const searchUrl = new URL(
    GOOGLE_DRIVE_FILES_URL
  );

  searchUrl.searchParams.set(
    "q",
    query
  );

  searchUrl.searchParams.set(
    "fields",
    "files(id,name)"
  );

  searchUrl.searchParams.set(
    "spaces",
    "drive"
  );

  const searchResponse = await fetch(
    searchUrl,
    {
      headers: {
        Authorization:
          `Bearer ${accessToken}`
      },
      cache: "no-store"
    }
  );

  const searchData =
    await readJsonResponse<
      GoogleDriveFileListResponse
    >(searchResponse);

  if (!searchResponse.ok) {
    throw new Error(
      searchData.error?.message ||
        "Unable to search Google Drive folders."
    );
  }

  const existingFolderId =
    searchData.files?.[0]?.id;

  if (existingFolderId) {
    return String(existingFolderId);
  }

  const createResponse = await fetch(
    GOOGLE_DRIVE_FILES_URL,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        name: safeFolderName,
        mimeType:
          "application/vnd.google-apps.folder"
      }),
      cache: "no-store"
    }
  );

  const createData =
    await readJsonResponse<
      GoogleDriveFileResponse
    >(createResponse);

  if (!createResponse.ok) {
    throw new Error(
      createData.error?.message ||
        "Unable to create the Google Drive backup folder."
    );
  }

  if (!createData.id) {
    throw new Error(
      "Google Drive did not return the new folder ID."
    );
  }

  return String(createData.id);
}

export async function uploadJsonBackup(
  accessToken: string,
  folderId: string,
  fileName: string,
  backupData: unknown
): Promise<{
  fileId: string;
  fileName: string;
  sizeBytes: number;
}> {
  if (!accessToken) {
    throw new Error(
      "Google access token is missing."
    );
  }

  if (!folderId) {
    throw new Error(
      "Google Drive backup folder ID is missing."
    );
  }

  const safeFileName =
    fileName.trim() ||
    `clientpilot-backup-${Date.now()}.json`;

  const jsonText = JSON.stringify(
    backupData,
    null,
    2
  );

  const boundary =
    `clientpilot_${crypto
      .randomBytes(16)
      .toString("hex")}`;

  const metadata = JSON.stringify({
    name: safeFileName,
    parents: [folderId],
    mimeType: "application/json"
  });

  const multipartBody = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    jsonText,
    `--${boundary}--`,
    ""
  ].join("\r\n");

  const uploadUrl = new URL(
    GOOGLE_DRIVE_UPLOAD_URL
  );

  uploadUrl.searchParams.set(
    "uploadType",
    "multipart"
  );

  uploadUrl.searchParams.set(
    "fields",
    "id,name"
  );

  const response = await fetch(
    uploadUrl,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
        "Content-Type":
          `multipart/related; boundary=${boundary}`
      },
      body: multipartBody,
      cache: "no-store"
    }
  );

  const data =
    await readJsonResponse<
      GoogleDriveFileResponse
    >(response);

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        "Unable to upload the Google Drive backup."
    );
  }

  if (!data.id) {
    throw new Error(
      "Google Drive did not return the uploaded file ID."
    );
  }

  return {
    fileId: String(data.id),
    fileName:
      String(data.name || safeFileName),
    sizeBytes:
      Buffer.byteLength(
        jsonText,
        "utf8"
      )
  };
}