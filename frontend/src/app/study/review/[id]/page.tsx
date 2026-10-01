"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  api,
  send,
  message,
  answerText,
  type Question,
  type Answer,
} from "@/lib/platform-api";
import {
  Button,
  PageTitle,
  ErrorMessage,
  Loading,
  Field,
  Notice,
  ActionLink,
} from "@/components/study/ui";

type ReviewData = {
  id: string;
  title: string;
  studentName: string;
  selfReview: boolean;
  score: number | null;
  maxScore: number;
  questions: Question[];
  answers: Record<string, Answer>;
  scores: { questionId: string; earned: number | null; points: number }[];
};
export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [review, setReview] = useState<ReviewData | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const data = await api<{ review: ReviewData }>(`/reviews/${id}`);
      setReview(data.review);
      setScores(
        Object.fromEntries(
          data.review.scores.map((item) => [
            item.questionId,
            item.earned === null ? "" : String(item.earned),
          ]),
        ),
      );
    } catch (error) {
      setError(message(error));
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!review)
    return error ? (
      <ErrorMessage retry={load}>{error}</ErrorMessage>
    ) : (
      <Loading label="Opening answer review…" />
    );
  return (
    <div>
      <PageTitle
        title={
          review.selfReview
            ? "Review your written answers"
            : "Grade this assessment"
        }
        description={`${review.title} · ${review.studentName}`}
        action={
          <ActionLink
            secondary
            href={
              review.selfReview ? `/study/attempts/${id}` : "/study/courses"
            }
          >
            Back to results
          </ActionLink>
        }
      />
      <Notice>
        {review.selfReview
          ? "This is a personal practice grade. Compare your answer with the rubric and record an honest score."
          : "You make the final grading decision. Changes are recorded in the assessment audit history."}
      </Notice>
      <ErrorMessage>{error}</ErrorMessage>
      {saved && (
        <Notice>Grades saved. The result now includes your review.</Notice>
      )}
      <form
        className="qb-stack"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          setSaved(false);
          try {
            const data = await send<{ review: ReviewData }>(`/reviews/${id}`, {
              scores: review.questions.map((question) => ({
                questionId: question.id,
                earned: Number(scores[question.id]),
              })),
              reason,
            });
            setReview(data.review);
            setSaved(true);
          } catch (error) {
            setError(message(error));
          } finally {
            setBusy(false);
          }
        }}
      >
        {review.questions.map((question, index) => (
          <section className="qb-panel" key={question.id}>
            <h2>
              {index + 1}. {question.prompt}
            </h2>
            <p>
              <strong>Submitted answer:</strong>{" "}
              {answerText(review.answers[question.id])}
            </p>
            <p>
              <strong>Answer / rubric:</strong>{" "}
              {answerText(question.correctAnswer)}
            </p>
            {question.explanation && <p>{question.explanation}</p>}
            <Field
              label={`Points for question ${index + 1}`}
              hint={`Out of ${question.points}`}
            >
              <input
                type="number"
                min="0"
                max={question.points}
                step="0.5"
                required
                value={scores[question.id] ?? ""}
                onChange={(event) =>
                  setScores((current) => ({
                    ...current,
                    [question.id]: event.target.value,
                  }))
                }
              />
            </Field>
          </section>
        ))}
        <Field label="Reason for this grade">
          <textarea
            required
            minLength={8}
            maxLength={1000}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain how the answers meet the grading criteria."
          />
        </Field>
        <div>
          <Button disabled={busy}>
            {busy ? "Saving review…" : "Save grades"}
          </Button>
        </div>
      </form>
    </div>
  );
}
