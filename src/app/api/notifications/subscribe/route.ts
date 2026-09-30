import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { savePushSubscription } from "@/lib/services/notification-service";
const schema = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }) });
export async function POST(request: NextRequest) { try { const input = schema.parse(await request.json()); await savePushSubscription(await requireSession(), { endpoint: input.endpoint, ...input.keys }); return NextResponse.json({ ok: true }); } catch (error) { return toApiErrorResponse(error); } }
