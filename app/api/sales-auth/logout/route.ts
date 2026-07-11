import { NextResponse } from "next/server";
import { clearSalesSession } from "@/lib/sales-session";

export const runtime = "nodejs";

export async function POST() {
  await clearSalesSession();

  return NextResponse.json({
    success: true,
    redirectTo: "/sales/login"
  });
}
