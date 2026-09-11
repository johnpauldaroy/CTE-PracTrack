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
export const scopeToRole = {
  /** Scope for querying InternProfile rows directly. */
  intern(user: SessionUser): Prisma.InternProfileWhereInput {
    switch (user.role) {
      case "ADMIN":
        return {};
      case "SUPERVISOR":
        if (!user.supervisorSchoolId) return { id: "__none__" };
        return { assignedSchoolId: user.supervisorSchoolId };
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
        if (!user.supervisorSchoolId) return { id: "__none__" };
        return { intern: { assignedSchoolId: user.supervisorSchoolId } };
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
        if (!user.supervisorSchoolId) return { id: "__none__" };
        return { intern: { assignedSchoolId: user.supervisorSchoolId } };
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
        if (!user.supervisorSchoolId) return { id: "__none__" };
        return { session: { intern: { assignedSchoolId: user.supervisorSchoolId } } };
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
        if (!user.supervisorSchoolId) return { id: "__none__" };
        return { intern: { assignedSchoolId: user.supervisorSchoolId } };
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
        if (!user.supervisorSchoolId) return { id: "__none__" };
        return { intern: { assignedSchoolId: user.supervisorSchoolId } };
      case "COOPERATING_TEACHER":
        // CTs have no PRD-granted access to alerts.
        return { id: "__none__" };
      case "STUDENT_INTERN":
        if (!user.internProfileId) return { id: "__none__" };
        return { internId: user.internProfileId };
    }
  },

  /** Scope for querying School rows (list/detail access, not mutation rights). */
  school(user: SessionUser): Prisma.SchoolWhereInput {
    switch (user.role) {
      case "ADMIN":
        return {};
      case "SUPERVISOR":
        if (!user.supervisorSchoolId) return { id: "__none__" };
        return { id: user.supervisorSchoolId };
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
  if (user.role === "SUPERVISOR" && user.supervisorSchoolId === schoolId) return;
  throw new ForbiddenError("School is outside your assigned scope.");
}
