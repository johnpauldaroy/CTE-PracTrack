import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ForbiddenError } from "@/lib/session";
import { checkGeofence } from "@/lib/geofence";
import { resolveEffectiveCheckInConfig } from "@/lib/check-in-config";
import { deriveAttendanceStatus, punchesOf, type AttendancePeriod } from "@/lib/attendance-status";
import { describePunchActions, planTimeIn, planTimeOut } from "@/lib/attendance-punch";
import { getDutyCalendarForIntern } from "@/lib/attendance-calendar";
import { todayManilaDateOnly, formatManila } from "@/lib/timezone";
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

  // A no-class/no-duty day blocks punching on the server; locking the buttons in the UI is a convenience only.
  const calendar = await getDutyCalendarForIntern(activeShifting, intern);
  const noDutyReason = calendar.noDutyReason(today);
  if (calendar.kind(today) === "NO_DUTY") {
    throw new Error(`No class or duty today: ${noDutyReason}. Time In and Time Out are not available.`);
  }

  return { intern, activeShifting, today };
}

type PunchKind = "In" | "Out";

/** Column data for one punch, keyed by period (the am and pm columns on the same daily row). */
function punchData(period: AttendancePeriod, kind: PunchKind, at: Date, input: AttendancePunchInput) {
  const prefix = period === "AM" ? "am" : "pm";
  return {
    [`${prefix}Time${kind}`]: at,
    [`${prefix}Time${kind}Lat`]: input.latitude,
    [`${prefix}Time${kind}Lng`]: input.longitude,
    [`${prefix}Time${kind}Source`]: "DEVICE",
  } as Prisma.AttendanceRecordUncheckedUpdateInput;
}

function assertInside(
  school: { latitude: Prisma.Decimal; longitude: Prisma.Decimal; geofenceRadiusMeters: number },
  input: AttendancePunchInput,
) {
  const geofence = checkGeofence(
    input.latitude,
    input.longitude,
    Number(school.latitude),
    Number(school.longitude),
    school.geofenceRadiusMeters,
  );
  if (!geofence.isInside) throw new OutOfRangeError(geofence.distanceMeters, school.geofenceRadiusMeters);
  return geofence;
}

export async function timeIn(actor: SessionUser, input: AttendancePunchInput) {
  const { intern, activeShifting, today } = await requireInternContext(actor);
  const school = intern.assignedSchool;

  const existing = await prisma.attendanceRecord.findUnique({
    where: { internId_date: { internId: intern.id, date: today } },
  });
  if (existing?.status === "EXCUSED") {
    throw new Error("Today is already marked Excused by your supervisor.");
  }

  const now = new Date();
  const config = await resolveEffectiveCheckInConfig(school.id);
  const period = planTimeIn(punchesOf(existing), now, today, config);
  const geofence = assertInside(school, input);

  const punches = punchesOf(existing);
  punches[period === "AM" ? "am" : "pm"].timeIn = now;
  const status = deriveAttendanceStatus({ dateOnly: today, punches, excusedAt: null, cutoffs: config });
  const data = punchData(period, "In", now, input);

  return prisma.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.upsert({
      where: { internId_date: { internId: intern.id, date: today } },
      update: { ...data, status },
      create: {
        ...(data as Prisma.AttendanceRecordUncheckedCreateInput),
        internId: intern.id,
        shiftingId: activeShifting.id,
        date: today,
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
            period,
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
  if (!existing) throw new Error("You must time in before you can time out.");

  const now = new Date();
  const config = await resolveEffectiveCheckInConfig(school.id);
  const period = planTimeOut(punchesOf(existing), now, today, config);
  const geofence = assertInside(school, input);

  const punches = punchesOf(existing);
  punches[period === "AM" ? "am" : "pm"].timeOut = now;
  const status = deriveAttendanceStatus({
    dateOnly: today,
    punches,
    excusedAt: existing.excusedAt,
    cutoffs: config,
  });
  const data = punchData(period, "Out", now, input);

  return prisma.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.update({
      where: { id: existing.id },
      data: { ...data, status },
    });

    await writeAuditLog(
      {
        actor,
        action: "ATTENDANCE_TIME_OUT",
        entityType: "AttendanceRecord",
        entityId: record.id,
        diff: {
          after: {
            period,
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
  const [effectiveConfig, activeShifting] = await Promise.all([
    resolveEffectiveCheckInConfig(intern.assignedSchoolId),
    prisma.shifting.findFirst({ where: { status: "ACTIVE" } }),
  ]);

  const record = await prisma.attendanceRecord.findUnique({
    where: { internId_date: { internId: intern.id, date: today } },
  });

  let noDuty: { reason: string } | null = null;
  if (activeShifting) {
    const calendar = await getDutyCalendarForIntern(activeShifting, intern);
    if (calendar.kind(today) === "NO_DUTY") noDuty = { reason: calendar.noDutyReason(today) ?? "No class or duty" };
  }

  const punches = punchesOf(record);
  const actions = noDuty
    ? {
        timeIn: { enabled: false, period: null, reason: `No class or duty today: ${noDuty.reason}` },
        timeOut: { enabled: false, period: null, reason: `No class or duty today: ${noDuty.reason}` },
      }
    : record?.status === "EXCUSED"
      ? {
          timeIn: { enabled: false, period: null, reason: "Today is marked Excused by your supervisor." },
          timeOut: { enabled: false, period: null, reason: "Today is marked Excused by your supervisor." },
        }
      : describePunchActions(punches, new Date(), today, effectiveConfig);

  return {
    record: record
      ? {
          status: record.status,
          amTimeIn: record.amTimeIn,
          amTimeOut: record.amTimeOut,
          pmTimeIn: record.pmTimeIn,
          pmTimeOut: record.pmTimeOut,
        }
      : null,
    effectiveConfig,
    noDuty,
    actions,
    schoolName: intern.assignedSchool.name,
  };
}
