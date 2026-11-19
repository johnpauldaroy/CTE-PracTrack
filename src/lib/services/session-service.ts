import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { scopeToRole } from "@/lib/scope";
import { ForbiddenError } from "@/lib/session";
import { computeCriterionScores, computeOverallScore } from "@/lib/evaluation-score";
import { refreshAlertsForIntern } from "@/lib/services/alert-service";
import type { SessionUser } from "@/lib/auth";
import type { AssignSessionInput, ReviewLessonPlanInput, SubmitEvaluationInput } from "@/lib/validation/session";
import type { Prisma } from "@/generated/prisma/client";

export async function listSessions(actor: SessionUser) {
  return prisma.teachingSession.findMany({
    where: scopeToRole.session(actor),
    include: {
      intern: { include: { user: { select: { name: true } } } },
      cooperatingTeacher: { include: { user: { select: { name: true } } } },
      evaluation: { include: { itemScores: true, submittedByUser: { select: { name: true } } } },
      documents: { where: { supersededByDocumentId: null } },
      shifting: { select: { name: true, status: true } },
    },
    orderBy: [{ date: "desc" }, { sessionNumber: "desc" }],
  });
}

/**
 * One intern's sessions for one shifting, each evaluation with its
 * per-criterion breakdown (admin drawer / supervisor intern detail). The
 * internId only narrows the caller's session scope — it never widens it.
 */
export async function listInternSessions(actor: SessionUser, internId: string, shiftingId: string) {
  const intern = await prisma.internProfile.findFirst({ where: { id: internId, ...scopeToRole.intern(actor) } });
  if (!intern) throw new ForbiddenError("Intern is outside your scope.");
  const shifting = await prisma.shifting.findUniqueOrThrow({ where: { id: shiftingId } });

  const sessions = await prisma.teachingSession.findMany({
    where: { ...scopeToRole.session(actor), internId, shiftingId },
    include: {
      cooperatingTeacher: { include: { user: { select: { name: true } } } },
      documents: { where: { supersededByDocumentId: null }, select: { id: true, type: true } },
      evaluation: {
        include: {
          submittedByUser: { select: { name: true } },
          itemScores: { include: { item: { include: { criterion: true } } } },
        },
      },
    },
    orderBy: { sessionNumber: "asc" },
  });

  return {
    shifting: { requiredTeachingSessions: shifting.requiredTeachingSessions, requiredFinalDemos: shifting.requiredFinalDemos },
    sessions: sessions.map(({ evaluation, ...session }) => ({
      ...session,
      evaluation: evaluation && {
        overallScore: evaluation.overallScore,
        commendable: evaluation.commendable,
        areasForImprovement: evaluation.areasForImprovement,
        submittedAt: evaluation.submittedAt,
        submittedBy: evaluation.submittedByUser.name,
        criteria: criterionBreakdown(evaluation.itemScores),
      },
    })),
  };
}

/**
 * Scores each criterion from the items actually rated in this evaluation, so
 * a later change to the instrument never re-scores a submitted evaluation.
 */
function criterionBreakdown(
  itemScores: { itemId: string; rating: number; item: { criterion: { id: string; name: string; order: number; weightPercent: Prisma.Decimal } } }[],
) {
  const criteria = new Map<string, { id: string; name: string; order: number; weightPercent: number; itemIds: string[] }>();
  for (const score of itemScores) {
    const { criterion } = score.item;
    const entry = criteria.get(criterion.id) ?? { id: criterion.id, name: criterion.name, order: criterion.order, weightPercent: Number(criterion.weightPercent), itemIds: [] };
    entry.itemIds.push(score.itemId);
    criteria.set(criterion.id, entry);
  }
  const ordered = [...criteria.values()].sort((a, b) => a.order - b.order);
  const scores = computeCriterionScores(ordered, new Map(itemScores.map((s) => [s.itemId, s.rating])));
  return ordered.map((criterion, index) => ({
    name: criterion.name,
    weightPercent: criterion.weightPercent,
    mean: scores[index].mean,
    weightedPercent: scores[index].weightedPercent,
  }));
}

export async function listCtInterns(actor: SessionUser) {
  if (actor.role !== "COOPERATING_TEACHER" || !actor.cooperatingTeacherProfileId) {
    throw new ForbiddenError("Only a cooperating teacher can access this roster.");
  }
  return prisma.internProfile.findMany({
    where: scopeToRole.intern(actor),
    include: { user: { select: { name: true, email: true } }, assignedSchool: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
}

export async function assignSession(actor: SessionUser, input: AssignSessionInput) {
  if (actor.role !== "COOPERATING_TEACHER" || !actor.cooperatingTeacherProfileId) {
    throw new ForbiddenError("Only a cooperating teacher can assign teaching sessions.");
  }
  const intern = await prisma.internProfile.findFirst({
    where: { ...scopeToRole.intern(actor), id: input.internId },
    include: { user: true },
  });
  if (!intern) throw new ForbiddenError("The intern is outside your assigned roster.");

  const shifting = await prisma.shifting.findFirst({ where: { status: "ACTIVE" } });
  if (!shifting) throw new Error("There is no active shifting.");
  const day = new Date(input.date.toISOString().slice(0, 10) + "T00:00:00.000Z");
  if (day < shifting.startDate || day > shifting.endDate) {
    throw new Error("The session date must fall within the active shifting.");
  }

  return prisma.$transaction(async (tx) => {
    const aggregate = await tx.teachingSession.aggregate({
      where: { internId: intern.id, shiftingId: shifting.id },
      _max: { sessionNumber: true },
    });
    const session = await tx.teachingSession.create({
      data: {
        internId: intern.id,
        shiftingId: shifting.id,
        cooperatingTeacherId: actor.cooperatingTeacherProfileId!,
        sessionNumber: (aggregate._max.sessionNumber ?? 0) + 1,
        date: day,
        subject: input.subject,
        gradeSection: input.gradeSection,
        topic: input.topic,
        type: input.type,
        notes: input.notes || null,
        lessonPlanDueDate: input.lessonPlanDueDate
          ? new Date(`${input.lessonPlanDueDate.toISOString().slice(0, 10)}T00:00:00.000Z`)
          : null,
      },
    });
    await tx.notification.create({
      data: {
        userId: intern.userId,
        type: "SESSION_ASSIGNED",
        title: "New teaching session",
        body: `${input.subject} — ${input.topic} has been assigned.${input.notes ? ` Note from your cooperating teacher: ${input.notes}` : ""}`,
        href: "/m/intern/sessions",
      },
    });
    await writeAuditLog({
      actor,
      action: "SESSION_ASSIGN",
      entityType: "TeachingSession",
      entityId: session.id,
      diff: { after: { internId: intern.id, shiftingId: shifting.id, sessionNumber: session.sessionNumber, notes: input.notes || null } } as Prisma.InputJsonValue,
    }, tx);
    return session;
  });
}

export async function getEvaluationInstrument(actor: SessionUser) {
  if (actor.role !== "COOPERATING_TEACHER") throw new ForbiddenError();
  return prisma.evaluationCriterion.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: { items: { where: { isActive: true }, orderBy: { order: "asc" } } },
  });
}

export async function submitEvaluation(actor: SessionUser, sessionId: string, input: SubmitEvaluationInput) {
  if (actor.role !== "COOPERATING_TEACHER" || !actor.cooperatingTeacherProfileId) {
    throw new ForbiddenError("Only a cooperating teacher can submit evaluations.");
  }
  const session = await prisma.teachingSession.findFirst({
    where: { ...scopeToRole.session(actor), id: sessionId },
    include: { intern: true, evaluation: true },
  });
  if (!session) throw new ForbiddenError("Session is outside your assigned scope.");
  if (session.evaluation) throw new Error("This evaluation has already been submitted and is immutable.");
  // The intern may not demo (and so cannot be evaluated) until the CT has approved the lesson plan.
  if (session.lessonPlanStatus !== "APPROVED") {
    throw new Error("Approve the intern's lesson plan before evaluating this session.");
  }

  const criteriaRows = await prisma.evaluationCriterion.findMany({
    where: { isActive: true },
    include: { items: { where: { isActive: true } } },
  });
  const criteria = criteriaRows.map((criterion) => ({
    id: criterion.id,
    weightPercent: Number(criterion.weightPercent),
    itemIds: criterion.items.map((item) => item.id),
  }));
  const ratings = new Map(input.ratings.map((entry) => [entry.itemId, entry.rating]));
  const expectedIds = new Set(criteria.flatMap((criterion) => criterion.itemIds));
  if (ratings.size !== input.ratings.length || [...ratings.keys()].some((id) => !expectedIds.has(id))) {
    throw new Error("Ratings contain a duplicate or inactive evaluation item.");
  }
  const overallScore = Math.round(computeOverallScore(criteria, ratings) * 100) / 100;

  const evaluation = await prisma.$transaction(async (tx) => {
    const evaluation = await tx.evaluation.create({
      data: {
        sessionId,
        submittedByUserId: actor.id,
        overallScore,
        commendable: input.commendable || null,
        areasForImprovement: input.areasForImprovement || null,
        itemScores: { create: [...ratings].map(([itemId, rating]) => ({ itemId, rating })) },
      },
    });
    await tx.teachingSession.update({ where: { id: sessionId }, data: { status: "EVALUATED" } });
    await tx.notification.create({
      data: {
        userId: session.intern.userId,
        type: "SESSION_EVALUATED",
        title: "Session evaluated",
        body: `Session ${session.sessionNumber} was evaluated (${overallScore.toFixed(2)}%).`,
        href: "/m/intern/sessions",
      },
    });
    await writeAuditLog({
      actor,
      action: "EVALUATION_SUBMIT",
      entityType: "Evaluation",
      entityId: evaluation.id,
      diff: { after: { sessionId, overallScore } } as Prisma.InputJsonValue,
    }, tx);
    return evaluation;
  });

  // Pace and pending-evaluation rules depend on evaluated sessions.
  await refreshAlertsForIntern(session.internId);
  return evaluation;
}

/**
 * The cooperating teacher's review of a submitted lesson plan: Approve (the intern may now
 * demo and be evaluated) or Return with a note (the intern fixes and re-submits). Scoped to
 * the CT's own sessions through scopeToRole, never a client-supplied id alone.
 */
export async function reviewLessonPlan(actor: SessionUser, sessionId: string, input: ReviewLessonPlanInput) {
  if (actor.role !== "COOPERATING_TEACHER" || !actor.cooperatingTeacherProfileId) {
    throw new ForbiddenError("Only the cooperating teacher can review a lesson plan.");
  }
  const session = await prisma.teachingSession.findFirst({
    where: { ...scopeToRole.session(actor), id: sessionId },
    include: { intern: { select: { userId: true } } },
  });
  if (!session) throw new ForbiddenError("Session is outside your assigned scope.");
  if (session.status === "EVALUATED") {
    throw new Error("This session has already been evaluated.");
  }
  if (session.lessonPlanStatus !== "SUBMITTED") {
    throw new Error("There is no submitted lesson plan waiting for review.");
  }

  const approve = input.action === "approve";
  return prisma.$transaction(async (tx) => {
    const updated = await tx.teachingSession.update({
      where: { id: sessionId },
      data: approve
        ? {
            lessonPlanStatus: "APPROVED",
            lessonPlanApprovedAt: new Date(),
            lessonPlanApprovedByUserId: actor.id,
            lessonPlanReturnNote: null,
          }
        : { lessonPlanStatus: "RETURNED", lessonPlanReturnNote: input.action === "return" ? input.note : null },
    });
    await tx.notification.create({
      data: {
        userId: session.intern.userId,
        type: approve ? "LESSON_PLAN_APPROVED" : "LESSON_PLAN_RETURNED",
        title: approve ? "Lesson plan approved" : "Lesson plan returned",
        body: approve
          ? `Your lesson plan for Session ${session.sessionNumber} (${session.subject}) is approved. You are ready for the demo.`
          : `Your lesson plan for Session ${session.sessionNumber} needs changes: ${input.action === "return" ? input.note : ""}`,
        href: "/m/intern/sessions",
      },
    });
    await writeAuditLog(
      {
        actor,
        action: approve ? "LESSON_PLAN_APPROVE" : "LESSON_PLAN_RETURN",
        entityType: "TeachingSession",
        entityId: sessionId,
        diff: {
          before: { status: session.lessonPlanStatus },
          after: { status: updated.lessonPlanStatus, ...(input.action === "return" ? { reason: input.note } : {}) },
        } as Prisma.InputJsonValue,
      },
      tx,
    );
    return updated;
  });
}
