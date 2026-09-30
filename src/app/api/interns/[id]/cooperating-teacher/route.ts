import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { assignCt, getCtAssignmentOptions } from "@/lib/services/ct-assignment-service";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; return NextResponse.json(await getCtAssignmentOptions(await requireSession(), id)); } catch (error) { return toApiErrorResponse(error); } }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; const { cooperatingTeacherId } = z.object({ cooperatingTeacherId: z.string().min(1).nullable() }).parse(await request.json()); return NextResponse.json({ intern: await assignCt(await requireSession(), id, cooperatingTeacherId) }); } catch (error) { return toApiErrorResponse(error); } }
