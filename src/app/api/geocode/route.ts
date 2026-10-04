import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { GeocoderUnavailableError, searchPlaces } from "@/lib/services/geocode-service";

const querySchema = z.object({ q: z.string().trim().min(3, "Type at least 3 characters").max(200) });

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const { q } = querySchema.parse({ q: request.nextUrl.searchParams.get("q") ?? "" });
    return NextResponse.json({ results: await searchPlaces(user, q) });
  } catch (error) {
    if (error instanceof GeocoderUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return toApiErrorResponse(error);
  }
}
