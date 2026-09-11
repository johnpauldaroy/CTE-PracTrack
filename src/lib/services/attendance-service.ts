import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ForbiddenError } from "@/lib/session";
import { checkGeofence } from "@/lib/geofence";
import { resolveEffectiveCheckInConfig } from "@/lib/check-in-config";
import { deriveAttendanceStatus } from "@/lib/attendance-status";
import { todayManilaDateOnly, isAtOrAfterManilaCutoff, formatManila } from "@/lib/timezone";
import type { SessionUser } from "@/lib/auth";
import type { AttendancePunchInput } from "@/lib/validation/attendance";
import type { Prisma } from "@/generated/prisma/client";

export class OutOfRangeError extends Error {
  constructor(public distanceMeters: number, public radiusMeters: number) {
    super(
      `You are ${Math.round(distanceMeters)}m from the school (allowed radius: ${radiusMeters}m). Move closer and try again.`,
    );
    this.name = "OutOfRangeError";
  }
}

async function requireInternContext(actor: SessionUser) {
  if (actor.role !== "STUDENT_INTERN" || !actor.internProfileId) {
    throw new ForbiddenError("Only a student intern can record their own attendance.");
  }

  const intern = await prisma.internProfile.findUniqueOrThrow({
    where: { id: actor.internProfileId },
    include: { assignedSchool: true },
  });

  const activeShifting = await prisma.shifting.findFirst({ where: { status: "ACTIVE" } });
  if (!activeShifting) {
    throw new Error("There is no active shifting. Attendance cannot be recorded right now.");
  }

  const today = todayManilaDateOnly();
  if (today < activeShifting.startDate || today > activeShifting.endDate) {
    throw new Error("Today is outside the active shifting's date range.");
  }

  return { intern, activeShifting, today };
}

export async function timeIn(actor: SessionUser, input: AttendancePunchInput) {
  const { intern, activeShifting, today } = await requireInternContext(actor);
  const school = intern.assignedSchool;

  const geofence = checkGeofence(
    input.latitude,
    input.longitude,
    Number(school.latitude),
    Number(school.longitude),
    school.geofenceRadiusMeters,
  );
  if (!geofence.isInside) {
    throw new OutOfRangeError(geofence.distanceMeters, school.geofenceRadiusMeters);
  }

  const existing = await prisma.attendanceRecord.findUnique({
    where: { internId_date: { internId: intern.id, date: today } },
  });
  if (existing?.timeIn) {
    throw new Error("You have already timed in today.");
  }
  if (existing?.status === "EXCUSED") {
    throw new Error("Today is already marked Excused by your supervisor.");
  }

  const now = new Date();
  const effectiveConfig = await resolveEffectiveCheckInConfig(school.id);
  const status = deriveAttendanceStatus({
    dateOnly: today,
    timeIn: now,
    timeOut: null,
    excusedAt: null,
    timeInCutoff: effectiveConfig.timeInCutoff,
  });

  return prisma.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.upsert({
      where: { internId_date: { internId: intern.id, date: today } },
      update: {
        timeIn: now,
        timeInLat: input.latitude,
        timeInLng: input.longitude,
        timeInSource: "DEVICE",
        status,
      },
      create: {
        internId: intern.id,
        shiftingId: activeShifting.id,
        date: today,
        timeIn: now,
        timeInLat: input.latitude,
        timeInLng: input.longitude,
        timeInSource: "DEVICE",
        status,
      },
    });

    await writeAuditLog(
      {
        actor,
        action: "ATTENDANCE_TIME_IN",
        entityType: "AttendanceRecord",
        entityId: record.id,
        diff: {
          after: {
            timeIn: formatManila(now, "yyyy-MM-dd HH:mm"),
            status,
            distanceMeters: Math.round(geofence.distanceMeters),
          },
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return record;
  });
}

export async function timeOut(actor: SessionUser, input: AttendancePunchInput) {
  const { intern, today } = await requireInternContext(actor);
  const school = intern.assignedSchool;

  const existing = await prisma.attendanceRecord.findUnique({
    where: { internId_date: { internId: intern.id, date: today } },
  });
  if (!existing?.timeIn) {
    throw new Error("You must time in before you can time out.");
  }
  if (existing.timeOut) {
    throw new Error("You have already timed out today.");
  }

  const effectiveConfig = await resolveEffectiveCheckInConfig(school.id);
  const now = new Date();
  if (!isAtOrAfterManilaCutoff(now, today, effectiveConfig.timeOutStart)) {
    throw new Error(`Time Out is available after ${effectiveConfig.timeOutStart}.`);
  }

  const geofence = checkGeofence(
    input.latitude,
    input.longitude,
    Number(school.latitude),
    Number(school.longitude),
    school.geofenceRadiusMeters,
  );
  if (!geofence.isInside) {
    throw new OutOfRangeError(geofence.distanceMeters, school.geofenceRadiusMeters);
  }

  const status = deriveAttendanceStatus({
    dateOnly: today,
    timeIn: existing.timeIn,
    timeOut: now,
    excusedAt: existing.excusedAt,
    timeInCutoff: effectiveConfig.timeInCutoff,
  });

  return prisma.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        timeOut: now,
        timeOutLat: input.latitude,
        timeOutLng: input.longitude,
        timeOutSource: "DEVICE",
        status,
      },
    });

    await writeAuditLog(
      {
        actor,
        action: "ATTENDANCE_TIME_OUT",
        entityType: "AttendanceRecord",
        entityId: record.id,
        diff: {
          after: {
            timeOut: formatManila(now, "yyyy-MM-dd HH:mm"),
            status,
            distanceMeters: Math.round(geofence.distanceMeters),
          },
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return record;
  });
}

/** Today's attendance state for the intern's own Home/Attendance screen. */
export async function getTodayAttendance(actor: SessionUser) {
  if (actor.role !== "STUDENT_INTERN" || !actor.internProfileId) {
    throw new ForbiddenError("Only a student intern can view their own attendance.");
  }

  const intern = await prisma.internProfile.findUniqueOrThrow({
    where: { id: actor.internProfileId },
    include: { assignedSchool: true },
  });
  const today = todayManilaDateOnly();
  const effectiveConfig = await resolveEffectiveCheckInConfig(intern.assignedSchoolId);

  const record = await prisma.attendanceRecord.findUnique({
    where: { internId_date: { internId: intern.id, date: today } },
  });

  return { record, effectiveConfig, schoolName: intern.assignedSchool.name };
}
