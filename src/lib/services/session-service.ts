import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { scopeToRole } from "@/lib/scope";
import { ForbiddenError } from "@/lib/session";
import { computeOverallScore } from "@/lib/evaluation-score";
import { refreshAlertsForIntern } from "@/lib/services/alert-service";
import type { SessionUser } from "@/lib/auth";
import type { AssignSessionInput, SubmitEvaluationInput } from "@/lib/validation/session";
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
      },
    });
    await tx.notification.create({
      data: {
        userId: intern.userId,
        type: "SESSION_ASSIGNED",
        title: "New teaching session",
        body: `${input.subject} — ${input.topic} has been assigned.`,
        href: "/m/intern/sessions",
      },
    });
    await writeAuditLog({
      actor,
      action: "SESSION_ASSIGN",
      entityType: "TeachingSession",
      entityId: session.id,
      diff: { after: { internId: intern.id, shiftingId: shifting.id, sessionNumber: session.sessionNumber } } as Prisma.InputJsonValue,
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
