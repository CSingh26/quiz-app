"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  FilePlus2,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import {
  api,
  date,
  message,
  quantity,
  type Quiz,
  type Attempt,
  type Course,
} from "@/lib/platform-api";
import { useUser } from "./shell";
import {
  ActionLink,
  Empty,
  ErrorMessage,
  Loading,
  PageTitle,
  SectionHeading,
  Tag,
} from "./ui";
type Dashboard = {
  quizzes: Quiz[];
  attempts: Attempt[];
  courses: Course[];
  stats: {
    completed: number;
    averageScore: number | null;
    studyMinutes: number;
  };
  topics: { topic: string; correct: number; total: number }[];
};
export function QuizList({ quizzes }: { quizzes: Quiz[] }) {
  return (
    <div className="qb-library-list">
      {quizzes.map((quiz) => (
        <Link
          href={`/study/quizzes/${quiz.id}`}
          className="qb-library-row"
          key={quiz.id}
        >
          <span className="qb-row-icon">
            <BookOpen size={23} strokeWidth={1.4} />
          </span>
          <div className="qb-row-main">
            <h3>{quiz.title}</h3>
            <p>
              {quiz.description ||
                "A private collection of questions, ready for practice."}
            </p>
            <div className="qb-row-meta">
              <span>{quantity(quiz.questionCount, "question")}</span>
              <span>Version {quiz.latestVersion}</span>
              <span>Edited {date(quiz.updatedAt)}</span>
            </div>
          </div>
          <Tag>{quiz.mode || quiz.settings?.mode || "practice"}</Tag>
          <ArrowRight size={19} />
        </Link>
      ))}
    </div>
  );
}
export function HomeScreen() {
  const user = useUser();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const load = () => {
    setError("");
    api<Dashboard>("/dashboard")
      .then(setData)
      .catch((error) => setError(message(error)));
  };
  useEffect(load, []);
  if (!data)
    return error ? (
      <ErrorMessage retry={load}>{error}</ErrorMessage>
    ) : (
      <Loading />
    );
  const active = data.attempts.filter(
    (attempt) => attempt.status === "in_progress",
  );
  const completed = data.attempts.filter(
    (attempt) => attempt.status !== "in_progress",
  );
  return (
    <>
      <PageTitle
        title={`Good to see you, ${user?.name.split(" ")[0] || "learner"}.`}
        description="A little practice today. A little more understanding tomorrow."
        action={
          <ActionLink href="/study/quizzes/new">
            <Plus size={18} />
            Create a quiz
          </ActionLink>
        }
      />
      {active.length > 0 && (
        <section className="qb-resume">
          <Clock3 size={25} />
          <div>
            <h2>Pick up where you left off.</h2>
            <p>{active[0].title} · Your answers are saved.</p>
          </div>
          <ActionLink href={`/study/attempts/${active[0].id}`}>
            Resume attempt <ArrowRight size={16} />
          </ActionLink>
        </section>
      )}
      <div className="qb-home-columns">
        <div>
          <section>
            <SectionHeading
              title="Your quiz collection"
              href="/study/quizzes"
            />
            {data.quizzes.length ? (
              <QuizList quizzes={data.quizzes.slice(0, 5)} />
            ) : (
              <Empty
                title="Every good question starts somewhere."
                action={
                  <ActionLink href="/study/quizzes/new">
                    <FilePlus2 size={18} />
                    Write your first quiz
                  </ActionLink>
                }
              >
                Turn a topic you’re learning into a few questions. Your
                collection stays private until you assign it to a course.
              </Empty>
            )}
          </section>
          <section className="qb-section">
            <SectionHeading title="Recent practice" />
            {completed.length ? (
              <div className="qb-simple-list">
                {completed.slice(0, 5).map((attempt) => (
                  <Link href={`/study/attempts/${attempt.id}`} key={attempt.id}>
                    <div>
                      <strong>{attempt.title}</strong>
                      <small>
                        {date(attempt.submittedAt || attempt.startedAt)}
                      </small>
                    </div>
                    <span>
                      {attempt.percentage == null
                        ? "Review available"
                        : `${Math.round(attempt.percentage)}%`}{" "}
                      <ArrowRight size={15} />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="qb-muted qb-empty-line">
                Your completed attempts will appear here. No rush—start with a
                question.
              </p>
            )}
          </section>
        </div>
        <aside className="qb-home-aside">
          <section className="qb-desk-note">
            <Sparkles size={24} strokeWidth={1.4} />
            <h2>
              Start from
              <br />
              what you’re reading.
            </h2>
            <p>
              Bring your notes into your workspace. Explore source passages, or
              generate a quiz draft when a provider is connected.
            </p>
            <Link href="/study/materials">
              Open study materials <ArrowRight size={17} />
            </Link>
          </section>
          <section className="qb-progress-summary">
            <h2>Your practice, so far</h2>
            <dl>
              <div>
                <dt>Completed attempts</dt>
                <dd>{data.stats.completed}</dd>
              </div>
              <div>
                <dt>Average score</dt>
                <dd>
                  {data.stats.completed && data.stats.averageScore != null
                    ? `${Math.round(data.stats.averageScore)}%`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Time studying</dt>
                <dd>{Math.round(data.stats.studyMinutes)} min</dd>
              </div>
            </dl>
            {data.topics.length > 0 && (
              <>
                <h3>Topic performance</h3>
                {[...data.topics]
                  .sort(
                    (a, b) =>
                      a.correct / (a.total || 1) - b.correct / (b.total || 1),
                  )
                  .slice(0, 3)
                  .map((topic) => (
                    <div className="qb-topic-row" key={topic.topic}>
                      <span>{topic.topic || "General"}</span>
                      <span>
                        {topic.correct}/{topic.total}
                      </span>
                    </div>
                  ))}
              </>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
export function QuizLibraryScreen() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const load = () =>
    api<{ quizzes: Quiz[] }>("/quizzes")
      .then((data) => setQuizzes(data.quizzes))
      .catch((error) => setError(message(error)));
  useEffect(() => {
    load();
  }, []);
  const filtered = quizzes?.filter((quiz) =>
    `${quiz.title} ${quiz.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title="My quizzes"
        description="A growing collection of things you want to understand."
        action={
          <ActionLink href="/study/quizzes/new">
            <Plus size={18} />
            Create a quiz
          </ActionLink>
        }
      />
      <ErrorMessage retry={load}>{error}</ErrorMessage>
      <label className="qb-search">
        <Search size={19} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a quiz in your collection"
          aria-label="Search your quizzes"
        />
      </label>
      {!quizzes ? (
        <Loading label="Opening your collection…" />
      ) : filtered?.length ? (
        <QuizList quizzes={filtered} />
      ) : (
        <Empty
          title={
            query ? "No matching quizzes." : "Your collection starts here."
          }
          action={
            !query && (
              <ActionLink href="/study/quizzes/new">
                Create your first quiz <ArrowRight size={16} />
              </ActionLink>
            )
          }
        >
          {query
            ? "Try a different title or clear your search."
            : "Write questions, save a version, and practice whenever you’re ready."}
        </Empty>
      )}
    </>
  );
}
