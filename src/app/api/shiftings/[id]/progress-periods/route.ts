import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { configureProgressPeriodsSchema, generateProgressPeriodsSchema } from "@/lib/validation/progress-report";
import { configureProgressPeriods, generatePeriods, listPeriods } from "@/lib/services/progress-report-service";

/** GET lists the periods; GET ?generate=7 previews back-to-back periods of that many days (nothing is saved). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    const { id } = await params;
    const generate = request.nextUrl.searchParams.get("generate");
    if (generate) {
      const { everyDays } = generateProgressPeriodsSchema.parse({ everyDays: Number(generate) });
      return NextResponse.json({ periods: await generatePeriods(actor, id, everyDays) });
    }
    return NextResponse.json({ periods: await listPeriods(id) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    const { id } = await params;
    const input = configureProgressPeriodsSchema.parse(await request.json());
    return NextResponse.json({ periods: await configureProgressPeriods(actor, id, input) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
