import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { accountLockSchema } from "@/lib/validation/account-lock";
import { lockAccounts, previewAccountLock, unlockAccounts } from "@/lib/services/account-lock-service";

/**
 * POST { action: "preview" | "lock" | "unlock", roles, schoolId?, userIds?, reason? }.
 * "preview" counts what a lock would touch; add `unlock: true`-style previews with action "unlock-preview"
 * is not needed: the panel previews the lock and shows the locked count separately.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireSession();
    const input = accountLockSchema.parse(await request.json());
    if (input.action === "preview") {
      const [lock, unlock] = await Promise.all([
        previewAccountLock(actor, input, "lock"),
        previewAccountLock(actor, input, "unlock"),
      ]);
      return NextResponse.json({ lock, unlock });
    }
    const result = input.action === "lock" ? await lockAccounts(actor, input) : await unlockAccounts(actor, input);
    return NextResponse.json(result);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
