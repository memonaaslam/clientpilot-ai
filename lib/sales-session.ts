import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const SALES_COOKIE_NAME = "clientpilot_sales_session";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createRawToken() {
  return randomBytes(32).toString("hex");
}

export async function createSalesSession(salesUserId: string, ownerId: string) {
  const supabase = createSupabaseAdminClient();
  const rawToken = createRawToken();
  const tokenHash = hashValue(rawToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await supabase.from("sales_staff_sessions").insert({
    sales_user_id: salesUserId,
    owner_id: ownerId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString()
  });

  const cookieStore = await cookies();

  cookieStore.set({
    name: SALES_COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSalesSession() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: SALES_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getCurrentSalesSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SALES_COOKIE_NAME)?.value;

  if (!token) return null;

  const supabase = createSupabaseAdminClient();
  const tokenHash = hashValue(token);

  const { data: session } = await supabase
    .from("sales_staff_sessions")
    .select("id,sales_user_id,owner_id,expires_at")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!session) return null;

  const { data: salesUser } = await supabase
    .from("sales_users")
    .select("id,owner_id,staff_id,name,email,phone,status")
    .eq("id", session.sales_user_id)
    .eq("status", "active")
    .maybeSingle();

  if (!salesUser) return null;

  await supabase
    .from("sales_staff_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", session.id);

  return {
    session,
    salesUser,
    ownerId: String(session.owner_id)
  };
}