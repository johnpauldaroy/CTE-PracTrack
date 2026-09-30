import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { getDocumentUrl } from "@/lib/services/document-service";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; const kind = z.enum(["session", "end"]).parse(request.nextUrl.searchParams.get("kind") ?? "session"); return NextResponse.json({ url: await getDocumentUrl(await requireSession(), id, kind) }); } catch (error) { return toApiErrorResponse(error); } }
