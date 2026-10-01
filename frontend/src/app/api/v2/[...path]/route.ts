import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticate,
  register,
  login,
  publicUser,
  rateLimit,
  listSessions,
  revokeSession,
  SESSION_COOKIE,
} from "@/server/auth";
import { verifyOrigin, verifyPassword } from "@/server/auth-core";
import { AppError } from "@/server/errors";
import { withHttp, jsonBody, fileBody } from "@/server/http";
import * as assessment from "@/server/assessment";
import * as materials from "@/server/materials";
import * as courses from "@/server/courses";
import * as mail from "@/server/mail";
import { dashboard } from "@/server/dashboard";
import { getReview, gradeReview, retryMistakes } from "@/server/review";
import * as banks from "@/server/banks";
import { QuestionsSchema } from "@/domain/assessment";
import { deleteAccount } from "@/server/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ok = () => NextResponse.json({ ok: true });
const empty = z.object({}).strict();

function cookieOptions() {
  const origin = new URL(process.env.APP_ORIGIN || "http://localhost:3018");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (
    process.env.NODE_ENV === "production" &&
    origin.protocol !== "https:" &&
    !(local && process.env.ALLOW_LOCAL_HTTP === "true")
  )
    throw new AppError(
      "CONFIGURATION_ERROR",
      "Secure authentication requires an HTTPS application origin.",
      503,
    );
  return {
    httpOnly: true,
    secure: origin.protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
  };
}

const handler = withHttp(async (request: NextRequest) => {
  const path = request.nextUrl.pathname.replace(/^\/api\/v2\//, "").split("/");
  const [resource, id, action] = path;
  const method = request.method;
  if (path.length > 3)
    throw new AppError("RESOURCE_NOT_FOUND", "Page not found.", 404);
  if (!["GET", "HEAD", "OPTIONS"].includes(method))
    verifyOrigin(
      request.headers.get("origin"),
      request.url,
      process.env.APP_ORIGIN,
    );
  const client =
    process.env.TRUST_PROXY === "true"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "direct"
      : "direct";

  if (resource === "auth") {
    if (method === "POST" && ["register", "login"].includes(id)) {
      await rateLimit(`auth-ip:${client}`, 50, 15 * 60 * 1000);
      const body = await jsonBody(request);
      const email =
        body &&
        typeof body === "object" &&
        "email" in body &&
        typeof body.email === "string"
          ? body.email.trim().toLowerCase()
          : "invalid";
      await rateLimit(`auth-email:${email}`, 12, 15 * 60 * 1000);
      const result =
        id === "register" ? await register(body) : await login(body);
      const response = NextResponse.json(
        { user: result.user },
        { status: id === "register" ? 201 : 200 },
      );
      response.cookies.set(SESSION_COOKIE, result.session.token, {
        ...cookieOptions(),
        expires: result.session.expiresAt,
      });
      return response;
    }
    if (
      method === "POST" &&
      ["forgot-password", "reset-password", "verify-email"].includes(id)
    ) {
      await rateLimit(`recovery:${client}`, 15, 15 * 60 * 1000);
      const body = await jsonBody(request);
      if (id === "forgot-password") await mail.requestPasswordReset(body);
      if (id === "reset-password") await mail.resetPassword(body);
      if (id === "verify-email") await mail.verifyEmail(body);
      return ok();
    }
  }

  const { user, sessionId } = await authenticate(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  await rateLimit(`requests:${user.id}`, 500, 60 * 1000);
  if (resource === "auth") {
    if (id === "me" && method === "GET")
      return NextResponse.json({
        user: {
          ...publicUser(user),
          emailVerified: Boolean(user.emailVerifiedAt),
        },
      });
    if (id === "logout" && method === "POST") {
      await revokeSession(user.id, sessionId);
      const response = ok();
      response.cookies.set(SESSION_COOKIE, "", {
        ...cookieOptions(),
        expires: new Date(0),
      });
      return response;
    }
    if (id === "send-verification" && method === "POST") {
      await rateLimit(`verify-mail:${user.id}`, 3, 15 * 60 * 1000);
      await mail.sendVerification(user.id);
      return ok();
    }
  }

  if (resource === "dashboard" && !id && method === "GET")
    return NextResponse.json(await dashboard(user.id));
  if (resource === "questions" && id === "validate" && method === "POST") {
    const body = z
      .object({ questions: QuestionsSchema })
      .strict()
      .parse(await jsonBody(request));
    return NextResponse.json(body);
  }
  if (resource === "banks") {
    if (!id && method === "GET")
      return NextResponse.json({ banks: await banks.listBanks(user.id) });
    if (!id && method === "POST")
      return NextResponse.json(
        { bank: await banks.createBank(user.id, await jsonBody(request)) },
        { status: 201 },
      );
    if (id && !action && method === "GET")
      return NextResponse.json({ bank: await banks.getBank(user.id, id) });
    if (id && !action && method === "PUT")
      return NextResponse.json({
        bank: await banks.updateBank(user.id, id, await jsonBody(request)),
      });
    if (id && !action && method === "DELETE") {
      await banks.deleteBank(user.id, id);
      return ok();
    }
    if (id && action === "sample" && method === "POST")
      return NextResponse.json({
        quiz: await banks.sampleBank(user.id, id, await jsonBody(request)),
      });
  }
  if (resource === "quizzes") {
    if (!id && method === "GET")
      return NextResponse.json({
        quizzes: await assessment.listQuizzes(user.id),
      });
    if (!id && method === "POST") {
      await rateLimit(`quiz-create:${user.id}`, 30, 60 * 60 * 1000);
      return NextResponse.json(
        { quiz: await assessment.createQuiz(user.id, await jsonBody(request)) },
        { status: 201 },
      );
    }
    if (id && !action && method === "GET")
      return NextResponse.json({ quiz: await assessment.getQuiz(user.id, id) });
    if (id && !action && method === "PUT")
      return NextResponse.json({
        quiz: await assessment.updateQuiz(user.id, id, await jsonBody(request)),
      });
    if (id && !action && method === "DELETE") {
      await assessment.deleteQuiz(user.id, id);
      return ok();
    }
    if (id && action === "start" && method === "POST") {
      await rateLimit(`start:${user.id}`, 30, 60 * 1000);
      return NextResponse.json({
        attempt: await assessment.startAttempt(
          user.id,
          id,
          await jsonBody(request),
        ),
      });
    }
  }
  if (resource === "attempts" && id) {
    if (!action && method === "GET")
      return NextResponse.json({
        attempt: await assessment.getAttempt(user.id, id),
      });
    if (action === "answers" && method === "PUT")
      return NextResponse.json({
        attempt: await assessment.saveAnswers(
          user.id,
          id,
          await jsonBody(request),
        ),
      });
    if (action === "submit" && method === "POST") {
      empty.parse(await jsonBody(request));
      return NextResponse.json({
        attempt: await assessment.submitAttempt(user.id, id),
      });
    }
    if (action === "events" && method === "POST") {
      await rateLimit(`events:${user.id}:${id}`, 100, 60 * 1000);
      await courses.recordIntegrityEvent(user.id, id, await jsonBody(request));
      return ok();
    }
    if (action === "retry" && method === "POST") {
      empty.parse(await jsonBody(request));
      return NextResponse.json({ quiz: await retryMistakes(user.id, id) });
    }
  }
  if (resource === "reviews" && id && !action) {
    if (method === "GET")
      return NextResponse.json({ review: await getReview(user.id, id) });
    if (method === "POST")
      return NextResponse.json({
        review: await gradeReview(user.id, id, await jsonBody(request)),
      });
  }
  if (resource === "materials") {
    if (!id && method === "GET")
      return NextResponse.json({
        materials: await materials.listMaterials(user.id),
      });
    if (!id && method === "POST") {
      await rateLimit(`uploads:${user.id}`, 20, 60 * 60 * 1000);
      return NextResponse.json(
        {
          material: await materials.uploadMaterial(
            user.id,
            await fileBody(request),
          ),
        },
        { status: 202 },
      );
    }
    if (id && !action && method === "DELETE") {
      await materials.deleteMaterial(user.id, id);
      return ok();
    }
    if (id && action === "chunks" && method === "GET")
      return NextResponse.json({
        chunks: await materials.getChunks(user.id, id),
      });
  }
  if (resource === "generation") {
    if (id === "config" && method === "GET")
      return NextResponse.json(materials.generationConfig());
    if (!id && method === "POST") {
      await rateLimit(`generation:${user.id}`, 10, 24 * 60 * 60 * 1000);
      return NextResponse.json(
        {
          job: await materials.enqueueGeneration(
            user.id,
            await jsonBody(request),
          ),
        },
        { status: 202 },
      );
    }
  }
  if (resource === "jobs" && id && !action && method === "GET")
    return NextResponse.json({ job: await materials.getJob(user.id, id) });
  if (resource === "courses") {
    if (!id && method === "GET")
      return NextResponse.json({ courses: await courses.listCourses(user.id) });
    if (!id && method === "POST")
      return NextResponse.json(
        {
          course: await courses.createCourse(user.id, await jsonBody(request)),
        },
        { status: 201 },
      );
    if (id === "join" && method === "POST") {
      await rateLimit(`join:${user.id}`, 20, 60 * 60 * 1000);
      return NextResponse.json({
        course: await courses.joinCourse(user.id, await jsonBody(request)),
      });
    }
    if (id && !action && method === "GET")
      return NextResponse.json(await courses.getCourse(user.id, id));
    if (id && action === "assignments" && method === "POST")
      return NextResponse.json(
        {
          assignment: await courses.createAssignment(
            user.id,
            id,
            await jsonBody(request),
          ),
        },
        { status: 201 },
      );
    if (id && action === "results" && method === "GET") {
      const results = await courses.courseResults(user.id, id);
      if (request.nextUrl.searchParams.get("format") === "csv")
        return new NextResponse(courses.resultsCsv(results), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="quizbee-results.csv"',
          },
        });
      return NextResponse.json({ results });
    }
  }
  if (resource === "assignments" && !id && method === "GET")
    return NextResponse.json({
      assignments: await courses.listAssignments(user.id),
    });
  if (resource === "sessions") {
    if (!id && method === "GET")
      return NextResponse.json({
        sessions: await listSessions(user.id, sessionId),
      });
    if (id && !action && method === "DELETE") {
      await revokeSession(user.id, id);
      return ok();
    }
  }
  if (resource === "account" && !id && method === "DELETE") {
    await rateLimit(`delete:${user.id}`, 5, 15 * 60 * 1000);
    const { password } = z
      .object({ password: z.string().min(1).max(128) })
      .strict()
      .parse(await jsonBody(request));
    if (!(await verifyPassword(password, user.passwordHash)))
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Your password is incorrect.",
        401,
      );
    await deleteAccount(user.id, user.passwordHash);
    const response = ok();
    response.cookies.set(SESSION_COOKIE, "", {
      ...cookieOptions(),
      expires: new Date(0),
    });
    return response;
  }
  throw new AppError("RESOURCE_NOT_FOUND", "This endpoint was not found.", 404);
});

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
