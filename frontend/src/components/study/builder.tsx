"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  GripVertical,
  Play,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  api,
  send,
  message,
  quantity,
  typeNames,
  type Answer,
  type Attempt,
  type Question,
  type QuestionType,
  type Quiz,
  type QuizSettings,
} from "@/lib/platform-api";
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
import { AnswerControl } from "./questions";
const initialSettings: QuizSettings = {
  durationMinutes: null,
  shuffleQuestions: false,
  shuffleOptions: false,
  mode: "practice",
  showExplanations: true,
};
const uid = () => crypto.randomUUID();
function freshQuestion(type: QuestionType = "single_choice"): Question {
  const choices =
    type === "true_false"
      ? [
          { id: uid(), text: "True" },
          { id: uid(), text: "False" },
        ]
      : ["single_choice", "multiple_select", "matching", "ordering"].includes(
            type,
          )
        ? [
            { id: uid(), text: "" },
            { id: uid(), text: "" },
          ]
        : [];
  return {
    id: uid(),
    type,
    prompt: "",
    choices,
    correctAnswer:
      type === "numeric"
        ? 0
        : type === "multiple_select" || type === "ordering"
          ? []
          : type === "matching"
            ? {}
            : "",
    explanation: "",
    difficulty: "medium",
    topic: "General",
    points: 1,
    sourceRefs: [],
    tags: [],
  };
}
export function BuilderScreen({ create = false }: { create?: boolean }) {
  const params = useParams();
  const id = create ? null : String(params.id);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [settings, setSettings] = useState<QuizSettings>(initialSettings);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(!create);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, Answer>>(
    {},
  );
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!id) {
      setQuestions([freshQuestion()]);
      return;
    }
    setLoading(true);
    api<{ quiz: Quiz }>(`/quizzes/${id}`)
      .then(({ quiz }) => {
        setTitle(quiz.title);
        setDescription(quiz.description);
        setQuestions(quiz.questions);
        setSettings(quiz.settings);
        setVersion(quiz.latestVersion);
        setDirty(false);
      })
      .catch((error) => setError(message(error)))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function editQuestion(index: number, update: Partial<Question>) {
    setQuestions((previous) =>
      previous.map((question, i) =>
        i === index ? { ...question, ...update } : question,
      ),
    );
    setDirty(true);
    setNotice("");
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= questions.length) return;
    setQuestions((previous) => {
      const next = [...previous];
      const [question] = next.splice(from, 1);
      next.splice(to, 0, question);
      return next;
    });
    setDirty(true);
  }
  function validate() {
    if (!title.trim()) return "Give your quiz a title before saving.";
    if (!questions.length) return "Add at least one question.";
    for (const [index, question] of questions.entries()) {
      if (!question.prompt.trim())
        return `Question ${index + 1} needs a prompt.`;
      if (question.choices.some((choice) => !choice.text.trim()))
        return `Complete every option in question ${index + 1}.`;
      if (
        question.type !== "essay" &&
        (question.correctAnswer === "" ||
          question.correctAnswer == null ||
          (Array.isArray(question.correctAnswer) &&
            !question.correctAnswer.length))
      )
        return `Set the correct answer for question ${index + 1}.`;
    }
    return null;
  }
  async function save(startAfter = false) {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError("");
    try {
      let quizId = id;
      if (dirty || !id) {
        const { quiz } = await send<{ quiz: Quiz }>(
          id ? `/quizzes/${id}` : "/quizzes",
          {
            title: title.trim(),
            description,
            questions: questions.map((question) => ({
              ...question,
              topic: question.topic.trim() || "General",
            })),
            settings,
          },
          id ? "PUT" : "POST",
        );
        quizId = quiz.id;
        setVersion(quiz.latestVersion);
        setDirty(false);
        setNotice(
          `Version ${quiz.latestVersion} saved. Existing attempts keep their original questions.`,
        );
        if (!id && !startAfter) router.replace(`/study/quizzes/${quiz.id}`);
      }
      if (startAfter && quizId) {
        const { attempt } = await send<{ attempt: Attempt }>(
          `/quizzes/${quizId}/start`,
        );
        router.push(`/study/attempts/${attempt.id}`);
      }
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function removeQuiz() {
    if (!id) return;
    setBusy(true);
    try {
      await api(`/quizzes/${id}`, { method: "DELETE" });
      setDirty(false);
      router.push("/study/quizzes");
    } catch (error) {
      setError(message(error));
      setBusy(false);
    }
  }
  async function importQuestions(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024)
        throw new Error("Question imports must be 1 MB or smaller.");
      const parsed = JSON.parse(await file.text());
      const values = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(values) || !values.length || values.length > 100)
        throw new Error(
          "Import a JSON array of 1–100 questions, or an object containing that questions array.",
        );
      const imported: Question[] = values.map((value: Partial<Question>) => {
        if (
          !value ||
          !value.type ||
          !typeNames[value.type] ||
          typeof value.prompt !== "string" ||
          !Array.isArray(value.choices)
        )
          throw new Error(
            "Each question needs a supported type, prompt, and choices array.",
          );
        return {
          ...freshQuestion(value.type),
          ...value,
          id: uid(),
          sourceRefs: [],
          tags: value.tags || [],
        } as Question;
      });
      const combined = [
        ...questions.filter((question) => question.prompt.trim()),
        ...imported,
      ];
      if (combined.length > 100)
        throw new Error("A quiz can contain at most 100 questions.");
      const validated = await send<{ questions: Question[] }>(
        "/questions/validate",
        { questions: combined },
      );
      setQuestions(validated.questions);
      setDirty(true);
      setNotice(
        `${quantity(imported.length, "question")} imported. Review the answers before saving.`,
      );
      setError("");
    } catch (error) {
      setError(message(error));
    }
    if (importInput.current) importInput.current.value = "";
  }
  if (loading) return <Loading label="Opening this quiz…" />;
  return (
    <>
      <Link className="qb-back" href="/study/quizzes">
        <ArrowLeft size={16} />
        My quizzes
      </Link>
      <PageTitle
        title={create ? "Make a little knowledge stick." : title || "Your quiz"}
        description={
          create
            ? "Start with a question. Build something worth coming back to."
            : `Private quiz · Version ${version}${dirty ? " · Unsaved changes" : ""}`
        }
        action={
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => save(false)}
            >
              <Save size={17} />
              {busy ? "Working…" : "Save quiz"}
            </Button>
            <Button disabled={busy} onClick={() => save(true)}>
              <Play size={17} />
              {dirty || create ? "Save & practice" : "Start practice"}
            </Button>
          </>
        }
      />
      <ErrorMessage>{error}</ErrorMessage>
      {notice && (
        <Notice>
          <Check size={17} />
          {notice}
        </Notice>
      )}
      <div
        className="qb-builder-tabs"
        role="group"
        aria-label="Quiz editor view"
      >
        <Button
          variant={view === "edit" ? "primary" : "quiet"}
          aria-pressed={view === "edit"}
          onClick={() => setView("edit")}
        >
          Edit questions
        </Button>
        <Button
          variant={view === "preview" ? "primary" : "quiet"}
          aria-pressed={view === "preview"}
          onClick={() => setView("preview")}
        >
          Preview quiz
        </Button>
        <span>
          {quantity(questions.length, "question")} ·{" "}
          {quantity(
            questions.reduce((sum, question) => sum + question.points, 0),
            "point",
          )}
        </span>
      </div>
      {view === "preview" ? (
        <section className="qb-preview">
          <Notice>
            This is an unsaved preview. Answers here do not count toward your
            results.
          </Notice>
          {questions.map((question, index) => (
            <article className="qb-preview-question" key={question.id}>
              <div className="qb-question-meta">
                <span>Question {index + 1}</span>
                <Tag>{typeNames[question.type]}</Tag>
              </div>
              <h2>{question.prompt || "Your question will appear here."}</h2>
              <AnswerControl
                question={question}
                answer={previewAnswers[question.id]}
                onChange={(answer) =>
                  setPreviewAnswers((previous) => ({
                    ...previous,
                    [question.id]: answer,
                  }))
                }
              />
            </article>
          ))}
        </section>
      ) : (
        <div className="qb-builder-grid">
          <div className="qb-builder-content">
            <section className="qb-quiz-details">
              <Field label="Quiz title">
                <input
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setDirty(true);
                  }}
                  placeholder="e.g. The foundations of cell biology"
                  maxLength={200}
                />
              </Field>
              <Field
                label="Description"
                hint="Optional. A little context for your future self."
              >
                <textarea
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setDirty(true);
                  }}
                  rows={2}
                  maxLength={2000}
                  placeholder="What would you like to understand?"
                />
              </Field>
            </section>
            {questions.map((question, index) => (
              <article
                className="qb-editor-question"
                key={question.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex.current !== null)
                    move(dragIndex.current, index);
                  dragIndex.current = null;
                }}
              >
                <header className="qb-question-editor-header">
                  <span
                    className="qb-drag-handle"
                    draggable
                    onDragStart={() => {
                      dragIndex.current = index;
                    }}
                    title="Drag to reorder"
                  >
                    <GripVertical size={18} />
                  </span>
                  <h2>Question {index + 1}</h2>
                  <Tag>
                    {question.points}{" "}
                    {question.points === 1 ? "point" : "points"}
                  </Tag>
                  <div className="qb-inline-actions">
                    <Button
                      variant="quiet"
                      type="button"
                      aria-label={`Move question ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUp size={16} />
                    </Button>
                    <Button
                      variant="quiet"
                      type="button"
                      aria-label={`Move question ${index + 1} down`}
                      disabled={index === questions.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDown size={16} />
                    </Button>
                    <Button
                      variant="quiet"
                      type="button"
                      aria-label={`Duplicate question ${index + 1}`}
                      onClick={() => {
                        setQuestions((previous) => [
                          ...previous.slice(0, index + 1),
                          { ...question, id: uid() },
                          ...previous.slice(index + 1),
                        ]);
                        setDirty(true);
                      }}
                    >
                      <Copy size={16} />
                    </Button>
                    <Button
                      variant="quiet"
                      type="button"
                      aria-label={`Remove question ${index + 1}`}
                      onClick={() => {
                        setQuestions((previous) =>
                          previous.filter((_, i) => index !== i),
                        );
                        setDirty(true);
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </header>
                <div className="qb-field-row">
                  <Field label="Question type">
                    <select
                      value={question.type}
                      onChange={(event) => {
                        const next = freshQuestion(
                          event.target.value as QuestionType,
                        );
                        editQuestion(index, {
                          ...next,
                          tolerance: undefined,
                          id: question.id,
                          prompt: question.prompt,
                          topic: question.topic,
                          explanation: question.explanation,
                        });
                      }}
                    >
                      {Object.entries(typeNames).map(([value, name]) => (
                        <option value={value} key={value}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Difficulty">
                    <select
                      value={question.difficulty}
                      onChange={(event) =>
                        editQuestion(index, {
                          difficulty: event.target
                            .value as Question["difficulty"],
                        })
                      }
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </Field>
                  <Field label="Points">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={question.points}
                      onChange={(event) =>
                        editQuestion(index, {
                          points: Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                </div>
                <Field label="Question">
                  <textarea
                    rows={3}
                    value={question.prompt}
                    onChange={(event) =>
                      editQuestion(index, { prompt: event.target.value })
                    }
                    placeholder="What would you like to ask?"
                    maxLength={10000}
                  />
                </Field>
                {question.choices.length > 0 && (
                  <fieldset className="qb-builder-choices">
                    <legend>
                      {question.type === "matching"
                        ? "Terms and correct matches"
                        : question.type === "ordering"
                          ? "Items in their correct order"
                          : "Options · select the correct answer"}
                    </legend>
                    {question.choices.map((choice, choiceIndex) => (
                      <div className="qb-builder-choice" key={choice.id}>
                        {[
                          "single_choice",
                          "true_false",
                          "multiple_select",
                        ].includes(question.type) && (
                          <input
                            type={
                              question.type === "multiple_select"
                                ? "checkbox"
                                : "radio"
                            }
                            name={`correct-${question.id}`}
                            aria-label={`Option ${choiceIndex + 1} is correct`}
                            checked={
                              Array.isArray(question.correctAnswer)
                                ? question.correctAnswer.includes(choice.id)
                                : question.correctAnswer === choice.id
                            }
                            onChange={(event) =>
                              editQuestion(index, {
                                correctAnswer:
                                  question.type === "multiple_select"
                                    ? event.target.checked
                                      ? [
                                          ...(Array.isArray(
                                            question.correctAnswer,
                                          )
                                            ? question.correctAnswer
                                            : []),
                                          choice.id,
                                        ]
                                      : (
                                          question.correctAnswer as string[]
                                        ).filter((id) => id !== choice.id)
                                    : choice.id,
                              })
                            }
                          />
                        )}
                        <input
                          aria-label={`Question ${index + 1} option ${choiceIndex + 1}`}
                          value={choice.text}
                          readOnly={question.type === "true_false"}
                          onChange={(event) =>
                            editQuestion(index, {
                              choices: question.choices.map((item, i) =>
                                i === choiceIndex
                                  ? { ...item, text: event.target.value }
                                  : item,
                              ),
                            })
                          }
                          placeholder={`Option ${choiceIndex + 1}`}
                        />
                        {question.type === "matching" && (
                          <input
                            aria-label={`Correct match for option ${choiceIndex + 1}`}
                            value={
                              typeof question.correctAnswer === "object" &&
                              !Array.isArray(question.correctAnswer)
                                ? question.correctAnswer[choice.id] || ""
                                : ""
                            }
                            onChange={(event) =>
                              editQuestion(index, {
                                correctAnswer: {
                                  ...(typeof question.correctAnswer ===
                                    "object" &&
                                  !Array.isArray(question.correctAnswer)
                                    ? question.correctAnswer
                                    : {}),
                                  [choice.id]: event.target.value,
                                },
                              })
                            }
                            placeholder="Correct match"
                          />
                        )}
                        {question.type !== "true_false" && (
                          <Button
                            variant="quiet"
                            aria-label={`Remove option ${choiceIndex + 1}`}
                            disabled={question.choices.length <= 2}
                            onClick={() => {
                              const choices = question.choices.filter(
                                (item) => item.id !== choice.id,
                              );
                              const correctAnswer =
                                question.type === "ordering"
                                  ? choices.map((item) => item.id)
                                  : Array.isArray(question.correctAnswer)
                                    ? question.correctAnswer.filter(
                                        (id) => id !== choice.id,
                                      )
                                    : question.correctAnswer === choice.id
                                      ? ""
                                      : question.correctAnswer;
                              editQuestion(index, { choices, correctAnswer });
                            }}
                          >
                            <Trash2 size={15} />
                          </Button>
                        )}
                      </div>
                    ))}
                    {question.type !== "true_false" && (
                      <Button
                        variant="quiet"
                        onClick={() => {
                          const choices = [
                            ...question.choices,
                            { id: uid(), text: "" },
                          ];
                          editQuestion(index, {
                            choices,
                            ...(question.type === "ordering"
                              ? {
                                  correctAnswer: choices.map(
                                    (choice) => choice.id,
                                  ),
                                }
                              : {}),
                          });
                        }}
                      >
                        <Plus size={15} />
                        Add option
                      </Button>
                    )}
                    {question.type === "ordering" && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          editQuestion(index, {
                            correctAnswer: question.choices.map(
                              (choice) => choice.id,
                            ),
                          })
                        }
                      >
                        Use this as the correct order
                      </Button>
                    )}
                  </fieldset>
                )}
                {["short_answer", "fill_blank", "numeric"].includes(
                  question.type,
                ) && (
                  <div className="qb-field-row">
                    <Field label="Correct answer">
                      <input
                        type={question.type === "numeric" ? "number" : "text"}
                        step="any"
                        value={
                          typeof question.correctAnswer === "number" ||
                          typeof question.correctAnswer === "string"
                            ? question.correctAnswer
                            : ""
                        }
                        onChange={(event) =>
                          editQuestion(index, {
                            correctAnswer:
                              question.type === "numeric"
                                ? Number(event.target.value)
                                : event.target.value,
                          })
                        }
                      />
                    </Field>
                    {question.type === "numeric" && (
                      <Field label="Accepted tolerance">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={question.tolerance || 0}
                          onChange={(event) =>
                            editQuestion(index, {
                              tolerance: Number(event.target.value),
                            })
                          }
                        />
                      </Field>
                    )}
                  </div>
                )}
                {question.type === "essay" && (
                  <Notice>
                    Essay responses are saved for human review and remain
                    explicitly ungraded.
                  </Notice>
                )}
                <Field
                  label="Explanation"
                  hint="Shown after submission when explanations are enabled."
                >
                  <textarea
                    rows={2}
                    value={question.explanation || ""}
                    onChange={(event) =>
                      editQuestion(index, { explanation: event.target.value })
                    }
                    placeholder="Why is this answer correct?"
                  />
                </Field>
                <Field label="Topic">
                  <input
                    value={question.topic}
                    onChange={(event) =>
                      editQuestion(index, { topic: event.target.value })
                    }
                    placeholder="e.g. Cell structure"
                    maxLength={100}
                  />
                </Field>
                {!!question.sourceRefs?.length && (
                  <details className="qb-sources">
                    <summary>
                      {question.sourceRefs.length} source references
                    </summary>
                    {question.sourceRefs.map((source, i) => (
                      <blockquote key={i}>
                        <strong>{source.label}</strong>
                        <p>{source.quote}</p>
                      </blockquote>
                    ))}
                  </details>
                )}
              </article>
            ))}
            {!questions.length && (
              <Empty title="A fresh page.">
                Add a question below to begin.
              </Empty>
            )}
            <Button
              variant="secondary"
              className="qb-add-question"
              onClick={() => {
                setQuestions((previous) => [...previous, freshQuestion()]);
                setDirty(true);
              }}
              disabled={questions.length >= 100}
            >
              <Plus size={18} />
              Add a question
            </Button>
          </div>
          <aside className="qb-builder-settings">
            <h2>Practice settings</h2>
            <Field label="Mode">
              <select
                value={settings.mode}
                onChange={(event) => {
                  setSettings((previous) => ({
                    ...previous,
                    mode: event.target.value as "practice" | "exam",
                  }));
                  setDirty(true);
                }}
              >
                <option value="practice">Practice</option>
                <option value="exam">Exam</option>
              </select>
            </Field>
            <Field
              label="Time limit in minutes"
              hint="Leave blank for untimed practice."
            >
              <input
                type="number"
                min={1}
                max={1440}
                value={settings.durationMinutes ?? ""}
                onChange={(event) => {
                  setSettings((previous) => ({
                    ...previous,
                    durationMinutes: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }));
                  setDirty(true);
                }}
              />
            </Field>
            {(
              [
                "shuffleQuestions",
                "shuffleOptions",
                "showExplanations",
              ] as const
            ).map((key) => (
              <label className="qb-check" key={key}>
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(event) => {
                    setSettings((previous) => ({
                      ...previous,
                      [key]: event.target.checked,
                    }));
                    setDirty(true);
                  }}
                />
                <span>
                  {
                    {
                      shuffleQuestions: "Shuffle questions",
                      shuffleOptions: "Shuffle answer options",
                      showExplanations: "Show explanations after submission",
                    }[key]
                  }
                </span>
              </label>
            ))}
            <div className="qb-setting-note">
              <h3>Made for revisiting.</h3>
              <p>
                Each save creates a new version. An attempt always keeps the
                questions it started with.
              </p>
            </div>
            <h3>Bring your own questions</h3>
            <p className="qb-muted">
              Import question objects from a QuizBee JSON file. You can review
              every item before saving.
            </p>
            <input
              ref={importInput}
              type="file"
              accept="application/json,.json"
              aria-label="Import quiz questions JSON"
              onChange={(event) => importQuestions(event.target.files?.[0])}
            />
            {id && (
              <div className="qb-delete-section">
                {deleteConfirm ? (
                  <>
                    <p>Delete this quiz from your collection?</p>
                    <Button
                      variant="danger"
                      disabled={busy}
                      onClick={removeQuiz}
                    >
                      Confirm delete
                    </Button>
                    <Button
                      variant="quiet"
                      onClick={() => setDeleteConfirm(false)}
                    >
                      Keep quiz
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="quiet"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <Trash2 size={15} />
                    Delete quiz
                  </Button>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
