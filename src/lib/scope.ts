import type { SessionUser } from "@/lib/auth";
import { ForbiddenError } from "@/lib/session";
import type { Prisma } from "@/generated/prisma/client";

/**
 * The single shared scoping helper (CLAUDE.md). Every query that touches
 * interns, attendance, sessions, documents, or alerts must build its `where`
 * clause by spreading one of these fragments — never by hand-rolling a
 * per-module scope check against a client-supplied id.
 *
 * ADMIN gets an empty fragment (no restriction). Every other role's fragment
 * is derived entirely from the session, so a caller cannot widen their own
 * scope by passing a different schoolId/internId in the request.
 */
/** The schools a supervisor covers (empty for a supervisor with none assigned yet, e.g. pending approval). */
export function supervisorSchoolIdsOf(user: SessionUser): string[] {
  return user.supervisorSchoolIds ?? [];
}

export const scopeToRole = {
  /** Scope for querying InternProfile rows directly. */
  intern(user: SessionUser): Prisma.InternProfileWhereInput {
    switch (user.role) {
      case "ADMIN":
        return {};
      case "SUPERVISOR":
        if (!supervisorSchoolIdsOf(user).length) return { id: "__none__" };
        return { assignedSchoolId: { in: supervisorSchoolIdsOf(user) } };
      case "COOPERATING_TEACHER":
        if (!user.cooperatingTeacherProfileId) return { id: "__none__" };
        return { cooperatingTeacherId: user.cooperatingTeacherProfileId };
      case "STUDENT_INTERN":
        if (!user.internProfileId) return { id: "__none__" };
        return { id: user.internProfileId };
    }
  },

  /** Scope for querying AttendanceRecord rows (via the related intern). */
  attendance(user: SessionUser): Prisma.AttendanceRecordWhereInput {
    switch (user.role) {
      case "ADMIN":
        return {};
      case "SUPERVISOR":
        if (!supervisorSchoolIdsOf(user).length) return { id: "__none__" };
        return { intern: { assignedSchoolId: { in: supervisorSchoolIdsOf(user) } } };
      case "COOPERATING_TEACHER":
        // CTs have no PRD-granted access to raw attendance records.
        return { id: "__none__" };
      case "STUDENT_INTERN":
        if (!user.internProfileId) return { id: "__none__" };
        return { internId: user.internProfileId };
    }
  },

  /** Scope for querying TeachingSession rows. */
  session(user: SessionUser): Prisma.TeachingSessionWhereInput {
    switch (user.role) {
      case "ADMIN":
        return {};
      case "SUPERVISOR":
        if (!supervisorSchoolIdsOf(user).length) return { id: "__none__" };
        return { intern: { assignedSchoolId: { in: supervisorSchoolIdsOf(user) } } };
      case "COOPERATING_TEACHER":
        if (!user.cooperatingTeacherProfileId) return { id: "__none__" };
        return { cooperatingTeacherId: user.cooperatingTeacherProfileId };
      case "STUDENT_INTERN":
        if (!user.internProfileId) return { id: "__none__" };
        return { internId: user.internProfileId };
    }
  },

  /** Scope for querying SessionDocument rows (via the related session -> intern). */
  sessionDocument(user: SessionUser): Prisma.SessionDocumentWhereInput {
    switch (user.role) {
      case "ADMIN":
        return {};
      case "SUPERVISOR":
        if (!supervisorSchoolIdsOf(user).length) return { id: "__none__" };
        return { session: { intern: { assignedSchoolId: { in: supervisorSchoolIdsOf(user) } } } };
      case "COOPERATING_TEACHER":
        if (!user.cooperatingTeacherProfileId) return { id: "__none__" };
        return { session: { cooperatingTeacherId: user.cooperatingTeacherProfileId } };
      case "STUDENT_INTERN":
        if (!user.internProfileId) return { id: "__none__" };
        return { session: { internId: user.internProfileId } };
    }
  },

  /** Scope for querying EndOfTermSubmission rows. */
  endOfTermSubmission(user: SessionUser): Prisma.EndOfTermSubmissionWhereInput {
    switch (user.role) {
      case "ADMIN":
        return {};
      case "SUPERVISOR":
        if (!supervisorSchoolIdsOf(user).length) return { id: "__none__" };
        return { intern: { assignedSchoolId: { in: supervisorSchoolIdsOf(user) } } };
      case "COOPERATING_TEACHER":
        if (!user.cooperatingTeacherProfileId) return { id: "__none__" };
        return { intern: { cooperatingTeacherId: user.cooperatingTeacherProfileId } };
      case "STUDENT_INTERN":
        if (!user.internProfileId) return { id: "__none__" };
        return { internId: user.internProfileId };
    }
  },

  /** Scope for querying Alert rows. */
  alert(user: SessionUser): Prisma.AlertWhereInput {
    switch (user.role) {
      case "ADMIN":
        return {};
      case "SUPERVISOR":
        if (!supervisorSchoolIdsOf(user).length) return { id: "__none__" };
        return { intern: { assignedSchoolId: { in: supervisorSchoolIdsOf(user) } } };
      case "COOPERATING_TEACHER":
        // CTs have no PRD-granted access to alerts.
        return { id: "__none__" };
      case "STUDENT_INTERN":
        if (!user.internProfileId) return { id: "__none__" };
        return { internId: user.internProfileId };
    }
  },

  /**
   * Scope for NonDutyDay rows. A supervisor sees entries for their schools, for
   * interns at their schools, and the all-schools entries that affect them.
   */
  nonDutyDay(user: SessionUser): Prisma.NonDutyDayWhereInput {
    switch (user.role) {
      case "ADMIN":
        return {};
      case "SUPERVISOR": {
        const ids = supervisorSchoolIdsOf(user);
        if (!ids.length) return { id: "__none__" };
        return {
          OR: [
            { schoolId: { in: ids } },
            { intern: { assignedSchoolId: { in: ids } } },
            { schoolId: null, internId: null },
          ],
        };
      }
      default:
        // Interns and CTs never query the table directly; the DTR/punch services read it themselves.
        return { id: "__none__" };
    }
  },

  /**
   * Scope for ProgressReportSubmission rows. Supervisor + admin view them; the
   * intern sees their own; cooperating teachers have no access (the report goes to the school).
   */
  progressReport(user: SessionUser): Prisma.ProgressReportSubmissionWhereInput {
    switch (user.role) {
      case "ADMIN":
        return {};
      case "SUPERVISOR":
        if (!supervisorSchoolIdsOf(user).length) return { id: "__none__" };
        return { intern: { assignedSchoolId: { in: supervisorSchoolIdsOf(user) } } };
      case "STUDENT_INTERN":
        if (!user.internProfileId) return { id: "__none__" };
        return { internId: user.internProfileId };
      case "COOPERATING_TEACHER":
        return { id: "__none__" };
    }
  },

  /** Scope for querying School rows (list/detail access, not mutation rights). */
  school(user: SessionUser): Prisma.SchoolWhereInput {
    switch (user.role) {
      case "ADMIN":
        return {};
      case "SUPERVISOR":
        if (!supervisorSchoolIdsOf(user).length) return { id: "__none__" };
        return { id: { in: supervisorSchoolIdsOf(user) } };
      case "COOPERATING_TEACHER":
        return { cts: { some: { userId: user.id } } };
      case "STUDENT_INTERN":
        return { interns: { some: { userId: user.id } } };
    }
  },
};

/** Throws ForbiddenError unless the given schoolId is within the session's school scope. */
export function assertSchoolInScope(user: SessionUser, schoolId: string): void {
  if (user.role === "ADMIN") return;
  if (user.role === "SUPERVISOR" && supervisorSchoolIdsOf(user).includes(schoolId)) return;
  throw new ForbiddenError("School is outside your assigned scope.");
}
