import { createSupabaseServerClient } from "@/lib/supabase-server";

export class OwnerAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OwnerAccessError";
    this.status = status;
  }
}

function getAllowedOwnerEmails() {
  const configuredEmails =
    process.env.OWNER_EMAILS ||
    process.env.OWNER_EMAIL ||
    "";

  return configuredEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireOwnerUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new OwnerAccessError(
      "Please sign in to access the Makzora Owner Dashboard.",
      401
    );
  }

  const allowedOwnerEmails = getAllowedOwnerEmails();

  if (allowedOwnerEmails.length === 0) {
    throw new OwnerAccessError(
      "Owner access is not configured. Add OWNER_EMAILS to the environment variables.",
      500
    );
  }

  const userEmail = String(user.email || "")
    .trim()
    .toLowerCase();

  if (!userEmail || !allowedOwnerEmails.includes(userEmail)) {
    throw new OwnerAccessError(
      "This area is restricted to the Makzora owner.",
      403
    );
  }

  return user;
}