import crypto from "crypto";

const GOOGLE_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GOOGLE_USERINFO_URL =
  "https://openidconnect.googleapis.com/v1/userinfo";

const DRIVE_SCOPE =
  "https://www.googleapis.com/auth/drive.file";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function createGoogleDriveAuthorizationUrl(
  state: string
): string {
  const url = new URL(GOOGLE_AUTH_URL);

  url.searchParams.set(
    "client_id",
    requireEnv("GOOGLE_DRIVE_CLIENT_ID")
  );

  url.searchParams.set(
    "redirect_uri",
    requireEnv("GOOGLE_DRIVE_REDIRECT_URI")
  );

  url.searchParams.set("response_type", "code");

  url.searchParams.set(
    "scope",
    [
      "openid",
      "email",
      "profile",
      DRIVE_SCOPE
    ].join(" ")
  );

  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeGoogleCode(
  code: string
) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
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
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Google token exchange failed."
    );
  }

  return data as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
    token_type: string;
    id_token?: string;
  };
}

export async function getGoogleUser(
  accessToken: string
) {
  const response = await fetch(
    GOOGLE_USERINFO_URL,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Unable to read Google account."
    );
  }

  return data as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
}

function getEncryptionKey(): Buffer {
  const hexKey = requireEnv(
    "GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY"
  );

  if (!/^[a-fA-F0-9]{64}$/.test(hexKey)) {
    throw new Error(
      "GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY must be 64 hexadecimal characters."
    );
  }

  return Buffer.from(hexKey, "hex");
}

export function encryptRefreshToken(
  refreshToken: string
): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(refreshToken, "utf8"),
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
  const [ivPart, tagPart, encryptedPart] =
    encryptedValue.split(".");

  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error(
      "Stored Google token has an invalid format."
    );
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivPart, "base64")
  );

  decipher.setAuthTag(
    Buffer.from(tagPart, "base64")
  );

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(encryptedPart, "base64")
    ),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}
const GOOGLE_DRIVE_FILES_URL =
  "https://www.googleapis.com/drive/v3/files";

const GOOGLE_DRIVE_UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files";

export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const response = await fetch(
    "https://oauth2.googleapis.com/token",
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
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Unable to refresh Google access token."
    );
  }

  return {
    accessToken: String(data.access_token),
    expiresIn: Number(data.expires_in || 3600)
  };
}

export async function findOrCreateBackupFolder(
  accessToken: string,
  folderName: string
): Promise<string> {
  const query = encodeURIComponent(
    `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );

  const searchResponse = await fetch(
    `${GOOGLE_DRIVE_FILES_URL}?q=${query}&fields=files(id,name)&spaces=drive`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const searchData = await searchResponse.json();

  if (!searchResponse.ok) {
    throw new Error(
      searchData.error?.message ||
        "Unable to search Google Drive folders."
    );
  }

  if (searchData.files?.[0]?.id) {
    return String(searchData.files[0].id);
  }

  const createResponse = await fetch(
    GOOGLE_DRIVE_FILES_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: folderName,
        mimeType:
          "application/vnd.google-apps.folder"
      })
    }
  );

  const createData = await createResponse.json();

  if (!createResponse.ok) {
    throw new Error(
      createData.error?.message ||
        "Unable to create Google Drive backup folder."
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
  const jsonText = JSON.stringify(
    backupData,
    null,
    2
  );

  const boundary = `clientpilot_${crypto
    .randomBytes(16)
    .toString("hex")}`;

  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
    mimeType: "application/json"
  });

  const multipartBody = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    jsonText,
    `--${boundary}--`
  ].join("\r\n");

  const response = await fetch(
    `${GOOGLE_DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        "Unable to upload Google Drive backup."
    );
  }

  return {
    fileId: String(data.id),
    fileName: String(data.name || fileName),
    sizeBytes: Buffer.byteLength(
      jsonText,
      "utf8"
    )
  };
}