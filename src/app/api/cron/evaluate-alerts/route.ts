import { NextRequest, NextResponse } from "next/server";
import { evaluateAllAlerts } from "@/lib/services/alert-service";

// Invoked daily by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer $CRON_SECRET`; anything else is rejected so the
// endpoint can't be used to hammer the database.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET is not set; refusing to run.");
    return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await evaluateAllAlerts();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron] alert evaluation failed", error);
    return NextResponse.json({ error: "Alert evaluation failed." }, { status: 500 });
  }
}
