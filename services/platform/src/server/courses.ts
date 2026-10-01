import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { databaseNow } from "./clock";
import { AppError, requireValue } from "./errors";
import { hashPassword } from "./auth-core";
import { courseSchema, assignmentSchema, csvCell } from "./course-rules";
import { requirePermission } from "./permissions";
import { finalizeDueAttempts } from "./maintenance";

async function requireInstructor(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  requirePermission(user?.role ?? "", "course:create");
}

async function ownedCourse(userId: string, id: string) {
  return requireValue(
    await db.course.findFirst({ where: { id, ownerId: userId } }),
    "Course not found.",
  );
}

export async function listCourses(userId: string) {
  const courses = await db.course.findMany({
    where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return courses.map((course) => ({
    id: course.id,
    ownerId: course.ownerId,
    canManage: course.ownerId === userId,
    name: course.name,
    description: course.description,
    code: course.ownerId === userId ? course.code : "",
    memberCount: course._count.members,
    createdAt: course.createdAt,
  }));
}

export async function createCourse(userId: string, input: unknown) {
  await requireInstructor(userId);
  const body = courseSchema.parse(input);
  const course = await db.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        ...body,
        ownerId: userId,
        code: randomBytes(6).toString("hex").toUpperCase(),
      },
    });
    await tx.auditLog.create({
      data: { userId, action: "course.created", resourceId: course.id },
    });
    return course;
  });
  return { ...course, memberCount: 0, canManage: true };
}

export async function joinCourse(userId: string, input: unknown) {
  const { code } = z
    .object({
      code: z
        .string()
        .trim()
        .min(6)
        .max(24)
        .transform((value) => value.toUpperCase()),
    })
    .strict()
    .parse(input);
  const course = requireValue(
    await db.course.findUnique({ where: { code } }),
    "That course code was not found. Check the code with your instructor.",
  );
  if (course.ownerId !== userId)
    await db.courseMembership.upsert({
      where: { courseId_userId: { courseId: course.id, userId } },
      create: { courseId: course.id, userId },
      update: {},
    });
  return { id: course.id, name: course.name };
}

const assignmentInclude = {
  version: { select: { questions: true } },
  course: { select: { name: true, ownerId: true } },
} as const;
type AssignmentWithVersion = Awaited<
  ReturnType<
    typeof db.assignment.findMany<{ include: typeof assignmentInclude }>
  >
>[number];
function assignmentView(assignment: AssignmentWithVersion) {
  return {
    id: assignment.id,
    quizId: assignment.quizId,
    title: assignment.title,
    startsAt: assignment.startsAt,
    endsAt: assignment.endsAt,
    durationMinutes: assignment.durationMinutes,
    attemptLimit: assignment.attemptLimit,
    allowBacktracking: assignment.allowBacktracking,
    integrityEnabled: assignment.integrityEnabled,
    questionCount: Array.isArray(assignment.version.questions)
      ? assignment.version.questions.length
      : 0,
    courseName: assignment.course.name,
    requiresAccessCode: Boolean(assignment.accessCodeHash),
  };
}

export async function getCourse(userId: string, id: string) {
  const course = requireValue(
    await db.course.findFirst({
      where: {
        id,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: { _count: { select: { members: true } } },
    }),
    "Course not found.",
  );
  const canManage = course.ownerId === userId;
  const members = canManage
    ? await db.courseMembership.findMany({
        where: { courseId: id },
        select: { user: { select: { id: true, name: true, email: true } } },
        take: 100,
      })
    : [];
  const assignments = await db.assignment.findMany({
    where: { courseId: id },
    include: assignmentInclude,
    orderBy: { startsAt: "desc" },
    take: 100,
  });
  return {
    course: {
      id,
      ownerId: course.ownerId,
      canManage,
      name: course.name,
      description: course.description,
      code: canManage ? course.code : "",
      memberCount: course._count.members,
      createdAt: course.createdAt,
    },
    members: members.map((member) => member.user),
    assignments: assignments.map(assignmentView),
  };
}

export async function createAssignment(
  userId: string,
  courseId: string,
  input: unknown,
) {
  await ownedCourse(userId, courseId);
  const body = assignmentSchema.parse(input);
  const quiz = requireValue(
    await db.quiz.findFirst({
      where: { id: body.quizId, ownerId: userId, deletedAt: null },
      include: { versions: { orderBy: { number: "desc" }, take: 1 } },
    }),
    "Choose one of your own quizzes.",
  );
  const version = requireValue(
    quiz.versions[0],
    "The quiz has no published version.",
  );
  const accessCodeHash = body.accessCode
    ? await hashPassword(body.accessCode)
    : null;
  const assignment = await db.$transaction(async (tx) => {
    if (new Date(body.endsAt) <= (await databaseNow(tx)))
      throw new AppError(
        "VALIDATION_ERROR",
        "The assignment must end in the future.",
      );
    const value = await tx.assignment.create({
      data: {
        courseId,
        quizId: quiz.id,
        versionId: version.id,
        title: body.title,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        durationMinutes: body.durationMinutes,
        attemptLimit: body.attemptLimit,
        allowBacktracking: body.allowBacktracking,
        integrityEnabled: body.integrityEnabled,
        accessCodeHash,
      },
      include: assignmentInclude,
    });
    await tx.auditLog.create({
      data: { userId, action: "assignment.created", resourceId: value.id },
    });
    return value;
  });
  return assignmentView(assignment);
}

export async function listAssignments(userId: string) {
  return (
    await db.assignment.findMany({
      where: {
        course: {
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
      },
      include: assignmentInclude,
      orderBy: { startsAt: "desc" },
      take: 100,
    })
  ).map(assignmentView);
}

export async function courseResults(userId: string, id: string) {
  await ownedCourse(userId, id);
  await finalizeDueAttempts(undefined, id);
  const attempts = await db.attempt.findMany({
    where: { assignment: { courseId: id } },
    include: {
      user: { select: { name: true } },
      assignment: { select: { title: true } },
      _count: { select: { events: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 100,
  });
  return attempts.map((attempt) => ({
    attemptId: attempt.id,
    studentName: attempt.user.name,
    title: attempt.assignment?.title ?? "Assessment",
    score: attempt.score,
    maxScore: attempt.maxScore,
    percentage:
      attempt.score === null
        ? null
        : Math.round((attempt.score / Math.max(1, attempt.maxScore)) * 100),
    status: attempt.status,
    submittedAt: attempt.submittedAt,
    integrityCount: attempt._count.events,
  }));
}

export function resultsCsv(results: Awaited<ReturnType<typeof courseResults>>) {
  return [
    [
      "Student",
      "Assessment",
      "Score",
      "Possible",
      "Percentage",
      "Status",
      "Submitted",
      "Integrity signals",
    ],
    ...results.map((result) => [
      result.studentName,
      result.title,
      result.score,
      result.maxScore,
      result.percentage,
      result.status,
      result.submittedAt?.toISOString(),
      result.integrityCount,
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

export async function recordIntegrityEvent(
  userId: string,
  id: string,
  input: unknown,
) {
  const { type } = z
    .object({
      type: z.enum([
        "visibility_hidden",
        "focus_lost",
        "fullscreen_exit",
        "copy",
        "paste",
      ]),
    })
    .strict()
    .parse(input);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Attempt" WHERE id=${id} FOR UPDATE`;
    const attempt = requireValue(
      await tx.attempt.findFirst({
        where: { id, userId },
        include: { assignment: true },
      }),
      "Attempt not found.",
    );
    if (
      !attempt.assignment?.integrityEnabled ||
      attempt.status !== "in_progress" ||
      (attempt.expiresAt && attempt.expiresAt <= (await databaseNow(tx)))
    )
      throw new AppError(
        "FORBIDDEN",
        "Integrity signals are not enabled for this active attempt.",
        403,
      );
    await tx.integrityEvent.create({ data: { attemptId: id, type } });
  });
}
