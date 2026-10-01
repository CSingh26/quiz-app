"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Flag,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  api,
  send,
  message,
  quantity,
  answerText,
  typeNames,
  type Answer,
  type Attempt,
  type Question,
  type Quiz,
} from "@/lib/platform-api";
import { Button, ErrorMessage, Loading, Notice, PageTitle, Tag } from "./ui";
import { AnswerControl } from "./questions";
type Draft = {
  answers: Record<string, Answer>;
  flagged: string[];
  cursor: number;
  sequence: number;
};
const hasAnswer = (answer?: Answer) =>
  answer !== undefined &&
  answer !== "" &&
  (!Array.isArray(answer) || answer.length > 0) &&
  (typeof answer !== "object" || Object.keys(answer).length > 0);
function readable(answer: Answer, question?: Question) {
  if (!question) return answerText(answer);
  const text = (id: string) =>
    question.choices.find((choice) => choice.id === id)?.text || id;
  return Array.isArray(answer)
    ? answer.map(text).join(" → ")
    : typeof answer === "object" && answer
      ? Object.entries(answer)
          .map(([key, value]) => `${text(key)} → ${value}`)
          .join("; ")
      : typeof answer === "string"
        ? text(answer)
        : answerText(answer);
}
export function AttemptScreen() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const server = useRef<Attempt | null>(null);
  const draft = useRef<Draft>({
    answers: {},
    flagged: [],
    cursor: 0,
    sequence: 0,
  });
  const savedSequence = useRef(0);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clock = useRef({ serverTime: 0, localTime: 0 });
  const expiryHandled = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const applyServer = useCallback((value: Attempt) => {
    server.current = value;
    setAttempt(value);
    setAnswers(value.answers || {});
    setFlagged(value.flagged || []);
    const cursor = value.currentQuestionIndex || 0;
    setIndex(cursor);
    draft.current = {
      answers: value.answers || {},
      flagged: value.flagged || [],
      cursor,
      sequence: 0,
    };
    savedSequence.current = 0;
    clock.current = {
      serverTime: Date.parse(value.serverNow),
      localTime: performance.now(),
    };
    setSaveState("saved");
  }, []);
  const load = useCallback(() => {
    setError("");
    api<{ attempt: Attempt }>(`/attempts/${id}`)
      .then(({ attempt }) => applyServer(attempt))
      .catch((error) => setError(message(error)));
  }, [id, applyServer]);
  useEffect(load, [load]);
  const flush = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) return inFlight.current;
    const task = (async () => {
      while (draft.current.sequence > savedSequence.current) {
        const snapshot = { ...draft.current };
        const current = server.current;
        if (!current || current.status !== "in_progress") return false;
        setSaveState("saving");
        try {
          const { attempt: response } = await send<{ attempt: Attempt }>(
            `/attempts/${id}/answers`,
            {
              answers: snapshot.answers,
              flagged: snapshot.flagged,
              revision: current.revision,
              currentQuestionIndex: snapshot.cursor,
            },
            "PUT",
          );
          server.current = response;
          savedSequence.current = snapshot.sequence;
          clock.current = {
            serverTime: Date.parse(response.serverNow),
            localTime: performance.now(),
          };
          setAttempt(response);
          if (response.status !== "in_progress") {
            applyServer(response);
            return true;
          }
        } catch (error) {
          setError(
            `${message(error)} Your latest changes are still on this page. Retry saving, or reload the saved attempt.`,
          );
          setSaveState("error");
          return false;
        }
      }
      setSaveState("saved");
      return true;
    })();
    inFlight.current = task;
    try {
      return await task;
    } finally {
      inFlight.current = null;
    }
  }, [id, applyServer]);
  function update(
    nextAnswers: Record<string, Answer>,
    nextFlags = draft.current.flagged,
    cursor = draft.current.cursor,
  ) {
    draft.current = {
      answers: nextAnswers,
      flagged: nextFlags,
      cursor,
      sequence: draft.current.sequence + 1,
    };
    setAnswers(nextAnswers);
    setFlagged(nextFlags);
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void flush();
    }, 300);
  }
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (draft.current.sequence > savedSequence.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, []);
  const submit = useCallback(
    async (expired = false) => {
      setBusy(true);
      setError("");
      if (!expired && !(await flush())) {
        setBusy(false);
        return;
      }
      try {
        const { attempt } = await send<{ attempt: Attempt }>(
          `/attempts/${id}/submit`,
        );
        applyServer(attempt);
        setConfirm(false);
      } catch (error) {
        setError(message(error));
      } finally {
        setBusy(false);
      }
    },
    [id, flush, applyServer],
  );
  useEffect(() => {
    if (!attempt?.expiresAt || attempt.status !== "in_progress") {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const now =
        clock.current.serverTime + performance.now() - clock.current.localTime;
      const seconds = Math.max(
        0,
        Math.ceil((Date.parse(attempt.expiresAt as string) - now) / 1000),
      );
      setRemaining(seconds);
      if (seconds === 0 && !expiryHandled.current) {
        expiryHandled.current = true;
        void submit(true);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt?.expiresAt, attempt?.status, submit]);
  useEffect(() => {
    if (!attempt?.integrityEnabled || attempt.status !== "in_progress") return;
    const record = (type: string) => {
      void send(`/attempts/${id}/events`, { type }).catch(() => {});
    };
    const hidden = () => {
      if (document.hidden) record("visibility_hidden");
    };
    const blur = () => record("focus_lost");
    const fullscreen = () => {
      if (!document.fullscreenElement) record("fullscreen_exit");
    };
    const copy = () => record("copy");
    const paste = () => record("paste");
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("blur", blur);
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("copy", copy);
    document.addEventListener("paste", paste);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("blur", blur);
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("copy", copy);
      document.removeEventListener("paste", paste);
    };
  }, [attempt?.integrityEnabled, attempt?.status, id]);
  async function navigate(next: number) {
    if (!attempt || next < 0 || next >= attempt.questions.length) return;
    if (!attempt.allowBacktracking) {
      if (next <= index) return;
      setBusy(true);
      update(draft.current.answers, draft.current.flagged, next);
      const saved = await flush();
      setBusy(false);
      if (!saved) return;
    } else {
      update(draft.current.answers, draft.current.flagged, next);
    }
    setIndex(next);
    setTimeout(() => heading.current?.focus(), 0);
  }
  if (!attempt)
    return error ? (
      <ErrorMessage retry={load}>{error}</ErrorMessage>
    ) : (
      <Loading label="Restoring your attempt…" />
    );
  if (attempt.status !== "in_progress")
    return (
      <>
        <Link className="qb-back" href="/study">
          <ArrowLeft size={16} />
          Back to your desk
        </Link>
        <PageTitle
          title="A little clearer than before."
          description={attempt.title}
        />
        <div className="qb-results-banner">
          <CheckCircle2 size={38} strokeWidth={1.3} />
          <div>
            <h2>
              {attempt.status === "expired"
                ? "The time limit has ended."
                : "Your attempt is complete."}
            </h2>
            <p>
              {attempt.score == null
                ? "Your responses are saved. Grades may be awaiting review."
                : `${attempt.score} of ${quantity(attempt.maxScore, "point")}${attempt.percentage == null ? "" : ` · ${Math.round(attempt.percentage)}%`}`}
            </p>
          </div>
          <Tag>{attempt.status}</Tag>
        </div>
        <ErrorMessage>{error}</ErrorMessage>
        {attempt.pendingReview && (
          <Notice>
            Essay responses need human review. Any automatic score is
            provisional and does not mean those responses have been graded.
          </Notice>
        )}
        {attempt.review?.length ? (
          <section className="qb-review">
            <h2>Take a second look.</h2>
            <p className="qb-muted">
              Use the explanations and sources to decide what to revisit.
            </p>
            {attempt.review.map((review, reviewIndex) => {
              const question = attempt.questions.find(
                (question) => question.id === review.questionId,
              );
              return (
                <article className="qb-review-item" key={review.questionId}>
                  <header>
                    <span>Question {reviewIndex + 1}</span>
                    <Tag
                      tone={review.earned === review.points ? "success" : ""}
                    >
                      {review.earned == null
                        ? "Pending review"
                        : `${review.earned} / ${quantity(review.points, "point")}`}
                    </Tag>
                  </header>
                  <h3>{review.prompt}</h3>
                  <dl>
                    <div>
                      <dt>Your answer</dt>
                      <dd>{readable(review.answer, question)}</dd>
                    </div>
                    {question?.type !== "essay" && (
                      <div>
                        <dt>Correct answer</dt>
                        <dd>{readable(review.correctAnswer, question)}</dd>
                      </div>
                    )}
                  </dl>
                  {review.explanation && (
                    <div className="qb-review-explanation">
                      <strong>Why it works</strong>
                      <p>{review.explanation}</p>
                    </div>
                  )}
                  {!!review.sourceRefs?.length && (
                    <details className="qb-sources">
                      <summary>Read the source passages</summary>
                      {review.sourceRefs.map((source, sourceIndex) => (
                        <blockquote key={sourceIndex}>
                          <strong>{source.label}</strong>
                          <p>{source.quote}</p>
                        </blockquote>
                      ))}
                    </details>
                  )}
                </article>
              );
            })}
          </section>
        ) : (
          <Notice>
            Answer review has not been released for this attempt. Your responses
            and result are saved.
          </Notice>
        )}
        <div className="qb-bottom-actions qb-inline-actions">
          {attempt.pendingReview && attempt.mode === "practice" && (
            <Link
              className="qb-button qb-button-primary"
              href={`/study/review/${attempt.id}`}
            >
              Review essay responses
            </Link>
          )}
          {attempt.review?.some(
            (item) => item.earned !== null && item.earned < item.points,
          ) && (
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const { quiz } = await send<{ quiz: Quiz }>(
                    `/attempts/${attempt.id}/retry`,
                  );
                  router.push(`/study/quizzes/${quiz.id}`);
                } catch (error) {
                  setError(message(error));
                  setBusy(false);
                }
              }}
            >
              Practice these mistakes <RotateCcw size={16} />
            </Button>
          )}
          <Link className="qb-button qb-button-secondary" href="/study/quizzes">
            Back to my quizzes <ArrowRight size={17} />
          </Link>
        </div>
      </>
    );
  const question = attempt.questions[index];
  const answered = attempt.questions.filter((question) =>
    hasAnswer(answers[question.id]),
  ).length;
  if (!question)
    return (
      <ErrorMessage retry={load}>
        This attempt could not display its questions. Reload the saved attempt.
      </ErrorMessage>
    );
  return (
    <>
      <div className="qb-attempt-top">
        <Link
          className="qb-back"
          href="/study"
          onClick={(event) => {
            if (saveState !== "saved") {
              event.preventDefault();
              void flush().then((saved) => {
                if (saved) window.location.href = "/study";
              });
            }
          }}
        >
          <ArrowLeft size={16} />
          Save & leave
        </Link>
        <div className="qb-attempt-status">
          <span role="status">
            <Check size={15} />
            {saveState === "saved"
              ? "All changes saved"
              : saveState === "saving"
                ? "Saving answers…"
                : "Changes not saved"}
          </span>
          {remaining !== null && (
            <span
              className={`qb-timer ${remaining < 60 ? "qb-timer-urgent" : ""}`}
              aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}
            >
              <Clock3 size={17} />
              {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")}
            </span>
          )}
        </div>
      </div>
      <PageTitle
        title={attempt.title}
        description={`${attempt.mode === "exam" ? "Exam" : "Practice"} · ${quantity(attempt.questions.length, "question")} · ${quantity(attempt.maxScore, "point")}`}
      />
      <ErrorMessage>{error}</ErrorMessage>
      {remaining === 0 && (
        <Notice>
          The time limit has ended.{" "}
          <Button disabled={busy} onClick={() => void submit(true)}>
            {busy ? "Submitting your saved answers…" : "Retry submission"}
          </Button>
        </Notice>
      )}
      {saveState === "error" && (
        <div className="qb-inline-actions">
          <Button
            onClick={() => {
              setError("");
              void flush();
            }}
          >
            Retry saving
          </Button>
          <Button variant="secondary" onClick={load}>
            <RotateCcw size={16} />
            Reload saved attempt
          </Button>
        </div>
      )}
      {attempt.integrityEnabled && (
        <Notice>
          <ShieldCheck size={19} />
          This assignment records focus changes, tab visibility, fullscreen
          exits, and copy/paste events for instructor review. These signals
          alone do not prove misconduct.
        </Notice>
      )}
      {!attempt.allowBacktracking && (
        <Notice>
          This assignment allows forward navigation only. Review each answer
          before continuing.
        </Notice>
      )}
      <div className="qb-attempt-layout">
        <section className="qb-question-stage">
          <div className="qb-question-meta">
            <span>
              Question {index + 1} of {attempt.questions.length}
            </span>
            <Tag>{typeNames[question.type]}</Tag>
            <span>
              {question.points} {question.points === 1 ? "point" : "points"}
            </span>
          </div>
          <h2 ref={heading} tabIndex={-1}>
            {question.prompt}
          </h2>
          {question.type === "multiple_select" && (
            <p className="qb-muted">Select every answer that applies.</p>
          )}
          <AnswerControl
            question={question}
            answer={answers[question.id]}
            disabled={busy || remaining === 0}
            onChange={(answer) => {
              const next = { ...draft.current.answers };
              if (answer === "") delete next[question.id];
              else next[question.id] = answer;
              update(next);
            }}
          />
          <div className="qb-question-footer">
            <Button
              variant="quiet"
              disabled={busy}
              aria-pressed={flagged.includes(question.id)}
              onClick={() =>
                update(
                  draft.current.answers,
                  flagged.includes(question.id)
                    ? flagged.filter((id) => id !== question.id)
                    : [...flagged, question.id],
                )
              }
            >
              <Flag
                size={17}
                fill={flagged.includes(question.id) ? "currentColor" : "none"}
              />
              {flagged.includes(question.id)
                ? "Flagged for review"
                : "Flag this question"}
            </Button>
            <div className="qb-inline-actions">
              {attempt.allowBacktracking && (
                <Button
                  variant="secondary"
                  disabled={index === 0 || busy}
                  onClick={() => navigate(index - 1)}
                >
                  <ArrowLeft size={16} />
                  Previous
                </Button>
              )}
              {index < attempt.questions.length - 1 ? (
                <Button disabled={busy} onClick={() => navigate(index + 1)}>
                  Next question <ArrowRight size={16} />
                </Button>
              ) : (
                <Button disabled={busy} onClick={() => setConfirm(true)}>
                  Review & submit <Check size={16} />
                </Button>
              )}
            </div>
          </div>
        </section>
        <aside className="qb-question-index">
          <h2>Your progress</h2>
          <p>
            {answered} of {attempt.questions.length} answered
          </p>
          <progress
            value={answered}
            max={attempt.questions.length}
            aria-label="Questions answered"
          />
          <nav aria-label="Question navigation">
            {attempt.questions.map((item, position) => (
              <button
                key={item.id}
                onClick={() => navigate(position)}
                disabled={
                  busy || (!attempt.allowBacktracking && position !== index)
                }
                className={`${position === index ? "current" : ""} ${hasAnswer(answers[item.id]) ? "answered" : ""}`}
                aria-label={`Question ${position + 1}${hasAnswer(answers[item.id]) ? ", answered" : ", unanswered"}${flagged.includes(item.id) ? ", flagged" : ""}`}
                aria-current={position === index ? "step" : undefined}
              >
                {position + 1}
                {flagged.includes(item.id) && <Flag size={9} />}
              </button>
            ))}
          </nav>
          <p className="qb-small">
            Filled squares are answered. Flags mark questions you want to
            revisit.
          </p>
          {attempt.allowBacktracking && (
            <Button
              variant="secondary"
              disabled={busy}
              className="qb-full"
              onClick={() => setConfirm(true)}
            >
              Finish attempt
            </Button>
          )}
        </aside>
      </div>
      {confirm && (
        <section className="qb-submit-confirm" aria-label="Confirm submission">
          <h2>Ready to put your pencil down?</h2>
          <p>
            You’ve answered {answered} of{" "}
            {quantity(attempt.questions.length, "question")}.
            {answered < attempt.questions.length &&
              ` ${attempt.questions.length - answered} unanswered ${attempt.questions.length - answered === 1 ? "question" : "questions"} will receive no credit.`}{" "}
            {flagged.length > 0 &&
              `${flagged.length} ${flagged.length === 1 ? "question is" : "questions are"} flagged.`}{" "}
            You cannot change answers after submitting.
          </p>
          <div className="qb-inline-actions">
            <Button disabled={busy} onClick={() => void submit()}>
              {busy ? "Submitting…" : "Submit attempt"}
              <Check size={17} />
            </Button>
            <Button
              disabled={busy}
              variant="secondary"
              onClick={() => setConfirm(false)}
            >
              Keep working
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
