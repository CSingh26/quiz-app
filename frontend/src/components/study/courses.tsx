"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  Download,
  Plus,
  Users,
} from "lucide-react";
import {
  api,
  send,
  message,
  quantity,
  type Assignment,
  type Attempt,
  type Course,
  type Quiz,
} from "@/lib/platform-api";
import { useUser } from "./shell";
import {
  Button,
  Empty,
  ErrorMessage,
  Field,
  Loading,
  Notice,
  PageTitle,
  Tag,
} from "./ui";
export function CoursesScreen() {
  const user = useUser();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [create, setCreate] = useState(false);
  const load = useCallback(
    () =>
      api<{ courses: Course[] }>("/courses")
        .then((data) => setCourses(data.courses))
        .catch((error) => setError(message(error))),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(
    event: React.FormEvent<HTMLFormElement>,
    join: boolean,
  ) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const { course } = await send<{ course: Course }>(
        join ? "/courses/join" : "/courses",
        join
          ? { code: String(values.get("code")).trim() }
          : {
              name: values.get("name"),
              description: values.get("description"),
            },
      );
      router.push(`/study/courses/${course.id}`);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="A shared place to learn."
        description="Join a course, find your assignments, and keep learning together."
        action={
          user?.role !== "STUDENT" && (
            <Button onClick={() => setCreate(!create)}>
              <Plus size={17} />
              {create ? "Close course form" : "Create a course"}
            </Button>
          )
        }
      />
      <ErrorMessage>{error}</ErrorMessage>
      <form className="qb-join-form" onSubmit={(event) => submit(event, true)}>
        <div>
          <h2>Have a course code?</h2>
          <p>Enter the code your instructor shared with you.</p>
        </div>
        <Field label="Course code">
          <input
            name="code"
            required
            autoComplete="off"
            placeholder="Enter your course code"
            maxLength={64}
          />
        </Field>
        <Button type="submit" disabled={busy} variant="secondary">
          Join course <ArrowRight size={17} />
        </Button>
      </form>
      {create && (
        <form
          className="qb-inline-form"
          onSubmit={(event) => submit(event, false)}
        >
          <h2>A new course</h2>
          <Field label="Course name">
            <input
              name="name"
              required
              maxLength={160}
              placeholder="e.g. Biology, first principles"
            />
          </Field>
          <Field label="Description">
            <textarea
              name="description"
              maxLength={2000}
              rows={3}
              placeholder="What will you explore together?"
            />
          </Field>
          <Button disabled={busy} type="submit">
            {busy ? "Creating…" : "Create course"}
          </Button>
        </form>
      )}
      <section className="qb-section">
        <h2>Your courses</h2>
        {!courses ? (
          <Loading label="Finding your courses…" />
        ) : courses.length ? (
          <div className="qb-course-list">
            {courses.map((course) => (
              <Link key={course.id} href={`/study/courses/${course.id}`}>
                <Users size={26} strokeWidth={1.4} />
                <div>
                  <h3>{course.name}</h3>
                  <p>
                    {course.description ||
                      "A shared space for questions and assignments."}
                  </p>
                  <small>
                    {course.memberCount}{" "}
                    {course.memberCount === 1 ? "learner" : "learners"} ·{" "}
                    {course.canManage ? "You manage this course" : "Member"}
                  </small>
                </div>
                <ArrowRight size={19} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="Learning together starts here.">
            {user?.role === "STUDENT"
              ? "Ask your instructor for a course code, then enter it above."
              : "Create your first course or use a code to join an existing one."}
          </Empty>
        )}
      </section>
    </>
  );
}
type Result = {
  attemptId: string;
  studentName: string;
  title: string;
  score: number | null;
  maxScore: number;
  percentage: number | null;
  status: string;
  submittedAt: string | null;
  integrityCount: number;
  pendingReview?: boolean;
};
type Detail = {
  course: Course;
  members: { id: string; name: string; email: string }[];
  assignments: Assignment[];
};
const localDatetime = (hours: number) => {
  const value = new Date(Date.now() + hours * 3600000);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
};
export function CourseScreen() {
  const { id } = useParams() as { id: string };
  const user = useUser();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    try {
      const detail = await api<Detail>(`/courses/${id}`);
      setData(detail);
      if (detail.course.canManage || detail.course.ownerId === user?.id) {
        const [quizData, resultData] = await Promise.all([
          api<{ quizzes: Quiz[] }>("/quizzes"),
          api<{ results: Result[] }>(`/courses/${id}/results`),
        ]);
        setQuizzes(quizData.quizzes);
        setResults(resultData.results);
      }
    } catch (error) {
      setError(message(error));
    }
  }, [id, user?.id]);
  useEffect(() => {
    void load();
  }, [load]);
  async function assign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await send(`/courses/${id}/assignments`, {
        quizId: values.get("quizId"),
        title: values.get("title"),
        startsAt: new Date(String(values.get("startsAt"))).toISOString(),
        endsAt: new Date(String(values.get("endsAt"))).toISOString(),
        durationMinutes: Number(values.get("durationMinutes")),
        attemptLimit: Number(values.get("attemptLimit")),
        ...(values.get("accessCode")
          ? { accessCode: values.get("accessCode") }
          : {}),
        allowBacktracking: values.get("allowBacktracking") === "on",
        integrityEnabled: values.get("integrityEnabled") === "on",
      });
      setShowAssign(false);
      setNotice(
        "Assignment created. Its questions are fixed to the current quiz version.",
      );
      await load();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function start(assignment: Assignment) {
    setBusy(true);
    setError("");
    try {
      const { attempt } = await send<{ attempt: Attempt }>(
        `/quizzes/${assignment.quizId}/start`,
        {
          assignmentId: assignment.id,
          ...(codes[assignment.id] ? { accessCode: codes[assignment.id] } : {}),
        },
      );
      router.push(`/study/attempts/${attempt.id}`);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return error ? (
      <ErrorMessage retry={() => void load()}>{error}</ErrorMessage>
    ) : (
      <Loading label="Opening this course…" />
    );
  const manage = data.course.canManage || data.course.ownerId === user?.id;
  return (
    <>
      <Link href="/study/courses" className="qb-back">
        <ArrowLeft size={16} />
        All courses
      </Link>
      <PageTitle
        title={data.course.name}
        description={
          data.course.description || "A shared space for practice and progress."
        }
        action={
          manage && (
            <Button onClick={() => setShowAssign(!showAssign)}>
              <Plus size={17} />
              Assign a quiz
            </Button>
          )
        }
      />
      <ErrorMessage>{error}</ErrorMessage>
      {notice && (
        <Notice>
          <Check size={17} />
          {notice}
        </Notice>
      )}
      {manage && (
        <div className="qb-course-code">
          <div>
            <span>Share this course code</span>
            <strong>{data.course.code}</strong>
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(data.course.code);
                setNotice("Course code copied.");
              } catch {
                setError(
                  "Could not copy automatically. Select the course code and copy it manually.",
                );
              }
            }}
          >
            <Copy size={16} />
            Copy code
          </Button>
          <span>{data.course.memberCount} enrolled learners</span>
        </div>
      )}
      {showAssign && manage && (
        <form className="qb-inline-form" onSubmit={assign}>
          <h2>Set up an assignment</h2>
          {!quizzes.length && (
            <Notice>
              Create a quiz in your library before assigning it.{" "}
              <Link href="/study/quizzes/new">Create a quiz</Link>
            </Notice>
          )}
          <div className="qb-field-row">
            <Field label="Quiz">
              <select name="quizId" required>
                <option value="">Choose a quiz</option>
                {quizzes.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title} · v{quiz.latestVersion}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assignment title">
              <input
                name="title"
                required
                maxLength={160}
                placeholder="e.g. Week 2 · A chance to practice"
              />
            </Field>
          </div>
          <div className="qb-field-row">
            <Field label="Opens" hint="Your local time zone.">
              <input
                type="datetime-local"
                name="startsAt"
                defaultValue={localDatetime(0)}
                required
              />
            </Field>
            <Field label="Closes" hint="Your local time zone.">
              <input
                type="datetime-local"
                name="endsAt"
                defaultValue={localDatetime(168)}
                required
              />
            </Field>
          </div>
          <div className="qb-field-row">
            <Field label="Time limit (minutes)">
              <input
                name="durationMinutes"
                type="number"
                min={1}
                max={600}
                defaultValue={30}
                required
              />
            </Field>
            <Field label="Attempt limit">
              <input
                name="attemptLimit"
                type="number"
                min={1}
                max={100}
                defaultValue={1}
                required
              />
            </Field>
            <Field label="Access code (optional)">
              <input name="accessCode" autoComplete="off" maxLength={64} />
            </Field>
          </div>
          <label className="qb-check">
            <input type="checkbox" name="allowBacktracking" defaultChecked />
            <span>Allow returning to earlier questions</span>
          </label>
          <label className="qb-check">
            <input type="checkbox" name="integrityEnabled" />
            <span>
              Record disclosed browser integrity signals for human review
            </span>
          </label>
          <p className="qb-small">
            Integrity signals report tab, focus, fullscreen, and clipboard
            events. They are not proof of misconduct.
          </p>
          <Button type="submit" disabled={busy || !quizzes.length}>
            {busy ? "Creating assignment…" : "Create assignment"}
          </Button>
        </form>
      )}
      <section className="qb-section">
        <h2>Assignments</h2>
        {data.assignments.length ? (
          <div className="qb-assignment-list">
            {data.assignments.map((assignment) => {
              const future =
                new Date(assignment.startsAt).getTime() > Date.now();
              const ended = new Date(assignment.endsAt).getTime() < Date.now();
              return (
                <article key={assignment.id}>
                  <div className="qb-assignment-heading">
                    <CalendarDays size={22} />
                    <div>
                      <h3>{assignment.title}</h3>
                      <p>
                        {quantity(assignment.questionCount, "question")} ·{" "}
                        {quantity(assignment.durationMinutes, "minute")} ·{" "}
                        {assignment.attemptLimit}{" "}
                        {assignment.attemptLimit === 1 ? "attempt" : "attempts"}
                      </p>
                    </div>
                    <Tag>
                      {future ? "Scheduled" : ended ? "Closed" : "Open"}
                    </Tag>
                  </div>
                  <p className="qb-small">
                    {new Date(assignment.startsAt).toLocaleString()} –{" "}
                    {new Date(assignment.endsAt).toLocaleString()}
                  </p>
                  <p className="qb-small">
                    {assignment.allowBacktracking
                      ? "You can revisit questions."
                      : "Forward navigation only."}
                    {assignment.integrityEnabled
                      ? " Browser integrity signals are recorded."
                      : ""}
                  </p>
                  {!manage && (
                    <div className="qb-assignment-start">
                      {assignment.requiresAccessCode && (
                        <Field label="Assignment access code">
                          <input
                            value={codes[assignment.id] || ""}
                            onChange={(event) =>
                              setCodes((previous) => ({
                                ...previous,
                                [assignment.id]: event.target.value,
                              }))
                            }
                          />
                        </Field>
                      )}
                      <Button
                        disabled={busy || future || ended}
                        onClick={() => start(assignment)}
                      >
                        Start or resume <ArrowRight size={16} />
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <Empty title="Room for your next assignment.">
            {manage
              ? "Choose a quiz from your library and set a schedule to get started."
              : "Your instructor has not added an assignment yet. Check back when it’s ready."}
          </Empty>
        )}
      </section>
      {manage && (
        <>
          <section className="qb-section">
            <div className="qb-section-heading">
              <h2>Results</h2>
              <a
                className="qb-button qb-button-secondary"
                href={`/api/v2/courses/${id}/results?format=csv`}
                download
              >
                <Download size={16} />
                Export CSV
              </a>
            </div>
            {results.length ? (
              <div className="qb-table-wrap">
                <table>
                  <caption className="qb-sr-only">
                    Course assignment results
                  </caption>
                  <thead>
                    <tr>
                      <th>Learner</th>
                      <th>Assignment</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Signals</th>
                      <th>Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr key={result.attemptId}>
                        <td>{result.studentName}</td>
                        <td>{result.title}</td>
                        <td>
                          {result.score == null
                            ? "Pending"
                            : `${result.score}/${result.maxScore}`}
                        </td>
                        <td>{result.status}</td>
                        <td>{result.integrityCount}</td>
                        <td>
                          <Link href={`/study/review/${result.attemptId}`}>
                            Review attempt <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="qb-muted qb-empty-line">
                Results will appear after learners begin their assignments.
              </p>
            )}
          </section>
          <section className="qb-section">
            <h2>People in this course</h2>
            {data.members.length ? (
              <div className="qb-member-list">
                {data.members.map((member) => (
                  <div key={member.id}>
                    <span className="qb-avatar">{member.name.slice(0, 1)}</span>
                    <div>
                      <strong>{member.name}</strong>
                      <small>{member.email}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="qb-muted">
                Share the course code to welcome your first learners.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
