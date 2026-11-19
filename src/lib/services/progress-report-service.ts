import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { scopeToRole } from "@/lib/scope";
import { ConflictError, FieldValidationError, ForbiddenError } from "@/lib/session";
import { DOCUMENT_BUCKET, getSupabaseAdmin } from "@/lib/supabase-server";
import { todayManilaDateOnly, formatManila } from "@/lib/timezone";
import type { SessionUser } from "@/lib/auth";
import type { ConfigureProgressPeriodsInput } from "@/lib/validation/progress-report";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Periodic progress reports. The intern submits one file per period to the school;
 * supervisors and admin view them (scopeToRole.progressReport — cooperating teachers
 * have no access). The admin decides how often by defining the periods per shifting
 * (weekly, or any specific date ranges).
 */

export type ProgressReportState = "SUBMITTED" | "UPCOMING" | "DUE" | "OVERDUE";

/** Computed, never stored: from the due date and today in Manila. */
export function progressReportState(
  period: { startDate: Date; dueDate: Date },
  submitted: boolean,
  today = todayManilaDateOnly(),
): ProgressReportState {
  if (submitted) return "SUBMITTED";
  if (today.getTime() < period.startDate.getTime()) return "UPCOMING";
  return today.getTime() > period.dueDate.getTime() ? "OVERDUE" : "DUE";
}

function toDateOnly(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120);
}

function requireAdmin(actor: SessionUser) {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only the CTE office can configure progress report periods.");
}

export async function listPeriods(shiftingId: string) {
  return prisma.progressReportPeriod.findMany({ where: { shiftingId }, orderBy: { startDate: "asc" } });
}

/** Replaces a shifting's periods with the admin's list. A period that already has submissions cannot be removed. */
export async function configureProgressPeriods(actor: SessionUser, shiftingId: string, input: ConfigureProgressPeriodsInput) {
  requireAdmin(actor);
  const shifting = await prisma.shifting.findUniqueOrThrow({ where: { id: shiftingId } });

  for (const period of input.periods) {
    if (toDateOnly(period.startDate) < shifting.startDate || toDateOnly(period.endDate) > shifting.endDate) {
      throw new FieldValidationError({ periods: [`"${period.label}" must fall inside the shifting dates.`] });
    }
  }

  return prisma.$transaction(async (tx) => {
    const before = await tx.progressReportPeriod.findMany({
      where: { shiftingId },
      include: { _count: { select: { submissions: true } } },
      orderBy: { startDate: "asc" },
    });
    const keepIds = new Set(input.periods.flatMap((p) => (p.id ? [p.id] : [])));
    const removed = before.filter((p) => !keepIds.has(p.id));
    const blocked = removed.filter((p) => p._count.submissions > 0);
    if (blocked.length) {
      throw new ConflictError(
        `Cannot remove ${blocked.map((p) => `"${p.label}"`).join(", ")}: interns already submitted reports for it.`,
      );
    }

    if (removed.length) await tx.progressReportPeriod.deleteMany({ where: { id: { in: removed.map((p) => p.id) } } });
    for (const period of input.periods) {
      const data = {
        label: period.label,
        startDate: toDateOnly(period.startDate),
        endDate: toDateOnly(period.endDate),
        dueDate: toDateOnly(period.dueDate),
      };
      if (period.id && before.some((p) => p.id === period.id)) {
        await tx.progressReportPeriod.update({ where: { id: period.id }, data });
      } else {
        await tx.progressReportPeriod.create({ data: { ...data, shiftingId } });
      }
    }

    const after = await tx.progressReportPeriod.findMany({ where: { shiftingId }, orderBy: { startDate: "asc" } });
    const describe = (p: { label: string; startDate: Date; endDate: Date; dueDate: Date }) =>
      `${p.label}: ${formatManila(p.startDate, "MMM d")} – ${formatManila(p.endDate, "MMM d")}, due ${formatManila(p.dueDate, "MMM d")}`;
    await writeAuditLog(
      {
        actor,
        action: "PROGRESS_PERIODS_CONFIGURE",
        entityType: "Shifting",
        entityId: shiftingId,
        diff: {
          before: { periods: before.map(describe).join("; ") || "None" },
          after: { periods: after.map(describe).join("; ") || "None" },
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );
    return after;
  });
}

/** Back-to-back periods of `everyDays` days across a shifting; due on each period's last day. Preview only: nothing is saved. */
export async function generatePeriods(actor: SessionUser, shiftingId: string, everyDays: number) {
  requireAdmin(actor);
  const shifting = await prisma.shifting.findUniqueOrThrow({ where: { id: shiftingId } });
  const periods: { label: string; startDate: string; endDate: string; dueDate: string }[] = [];
  const day = 86_400_000;
  for (let start = shifting.startDate.getTime(), n = 1; start <= shifting.endDate.getTime(); start += everyDays * day, n++) {
    const end = Math.min(start + (everyDays - 1) * day, shifting.endDate.getTime());
    periods.push({
      label: everyDays === 7 ? `Week ${n}` : `Period ${n}`,
      startDate: new Date(start).toISOString().slice(0, 10),
      endDate: new Date(end).toISOString().slice(0, 10),
      dueDate: new Date(end).toISOString().slice(0, 10),
    });
  }
  return periods;
}

/** The intern's own periods in the active shifting with the report on record for each. */
export async function listMyProgressReports(actor: SessionUser) {
  if (actor.role !== "STUDENT_INTERN" || !actor.internProfileId) throw new ForbiddenError("Only an intern can view this.");
  const shifting = await prisma.shifting.findFirst({ where: { status: "ACTIVE" } });
  if (!shifting) return { shiftingId: null, periods: [] };
  const periods = await prisma.progressReportPeriod.findMany({
    where: { shiftingId: shifting.id },
    include: {
      submissions: {
        where: { ...scopeToRole.progressReport(actor) },
        select: { id: true, originalFilename: true, uploadedAt: true },
      },
    },
    orderBy: { startDate: "asc" },
  });
  return {
    shiftingId: shifting.id,
    periods: periods.map((period) => {
      const submission = period.submissions[0] ?? null;
      return {
        id: period.id,
        label: period.label,
        startDate: period.startDate,
        endDate: period.endDate,
        dueDate: period.dueDate,
        state: progressReportState(period, !!submission),
        submission,
      };
    }),
  };
}

export async function uploadProgressReport(actor: SessionUser, periodId: string, file: File) {
  if (actor.role !== "STUDENT_INTERN" || !actor.internProfileId) throw new ForbiddenError("Only an intern can submit a progress report.");
  const internId = actor.internProfileId;
  const period = await prisma.progressReportPeriod.findUnique({ where: { id: periodId }, include: { shifting: true } });
  if (!period) throw new ForbiddenError("This reporting period does not exist.");
  if (period.shifting.status !== "ACTIVE") throw new Error("Progress reports can only be submitted in the active shifting.");
  if (todayManilaDateOnly() < period.startDate) throw new Error("This reporting period has not started yet.");

  const key = `${internId}/${period.shiftingId}/progress/${periodId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await getSupabaseAdmin().storage.from(DOCUMENT_BUCKET).upload(key, bytes, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return prisma.$transaction(async (tx) => {
    const where = { internId_periodId: { internId, periodId } };
    const previous = await tx.progressReportSubmission.findUnique({ where });
    const fileData = { storageKey: key, originalFilename: file.name, mimeType: file.type, sizeBytes: file.size, uploadedAt: new Date() };
    const submission = await tx.progressReportSubmission.upsert({
      where,
      update: fileData,
      create: { internId, periodId, ...fileData },
    });
    // A replace overwrites the row, so the previous file stays in the audit diff (its object stays in storage).
    const diff = previous
      ? { before: { period: period.label, filename: previous.originalFilename, storageKey: previous.storageKey }, after: { period: period.label, filename: file.name } }
      : { after: { period: period.label, filename: file.name, sizeBytes: file.size } };
    await writeAuditLog(
      {
        actor,
        action: previous ? "PROGRESS_REPORT_REPLACE" : "PROGRESS_REPORT_UPLOAD",
        entityType: "ProgressReportSubmission",
        entityId: submission.id,
        diff: diff as Prisma.InputJsonValue,
      },
      tx,
    );
    return submission;
  });
}

/** One intern's periods and reports for a shifting (supervisor / admin view). Scope derives from the session. */
export async function listInternProgressReports(actor: SessionUser, internId: string, shiftingId: string) {
  const intern = await prisma.internProfile.findFirst({ where: { id: internId, ...scopeToRole.intern(actor) } });
  if (!intern) throw new ForbiddenError("Intern is outside your scope.");
  if (actor.role === "COOPERATING_TEACHER") throw new ForbiddenError("Progress reports are not shared with cooperating teachers.");
  const periods = await prisma.progressReportPeriod.findMany({
    where: { shiftingId },
    include: {
      submissions: {
        where: { internId, ...scopeToRole.progressReport(actor) },
        select: { id: true, originalFilename: true, uploadedAt: true },
      },
    },
    orderBy: { startDate: "asc" },
  });
  return periods.map((period) => {
    const submission = period.submissions[0] ?? null;
    return {
      id: period.id,
      label: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      dueDate: period.dueDate,
      state: progressReportState(period, !!submission),
      submission,
    };
  });
}

export async function getProgressReportUrl(actor: SessionUser, submissionId: string) {
  const row = await prisma.progressReportSubmission.findFirst({ where: { id: submissionId, ...scopeToRole.progressReport(actor) } });
  if (!row) throw new ForbiddenError("This report is outside your scope.");
  const { data, error } = await getSupabaseAdmin().storage.from(DOCUMENT_BUCKET).createSignedUrl(row.storageKey, 300);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
