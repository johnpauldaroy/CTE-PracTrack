import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { resolveAlertSchema } from "@/lib/validation/alert";
import { resolveAlert } from "@/lib/services/alert-service";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; const { note } = resolveAlertSchema.parse(await request.json()); return NextResponse.json({ alert: await resolveAlert(await requireSession(), id, note) }); } catch (error) { return toApiErrorResponse(error); } }
