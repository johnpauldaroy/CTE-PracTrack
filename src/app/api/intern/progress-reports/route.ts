import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { validateDocumentFile } from "@/lib/validation/document";
import { listMyProgressReports, uploadProgressReport } from "@/lib/services/progress-report-service";

export async function GET() {
  try {
    return NextResponse.json(await listMyProgressReports(await requireSession()));
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSession();
    const form = await request.formData();
    const periodId = z.string().min(1, "Select a reporting period").parse(form.get("periodId"));
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("A file is required.");
    validateDocumentFile(file);
    const submission = await uploadProgressReport(actor, periodId, file);
    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
