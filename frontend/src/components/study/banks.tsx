"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FolderOpen,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  api,
  send,
  date,
  message,
  quantity,
  typeNames,
  type Question,
  type Quiz,
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
type Bank = {
  id: string;
  name: string;
  description: string;
  folder: string;
  questionCount: number;
  latestVersion: number;
  updatedAt: string;
  questions: Question[];
};
export function BanksScreen() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selected, setSelected] = useState<Bank | null>(null);
  const [create, setCreate] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [folder, setFolder] = useState("");
  const [dirty, setDirty] = useState(false);
  const load = useCallback(async () => {
    try {
      const [bankData, quizData] = await Promise.all([
        api<{ banks: Bank[] }>("/banks"),
        api<{ quizzes: Quiz[] }>("/quizzes"),
      ]);
      setBanks(bankData.banks);
      setQuizzes(quizData.quizzes);
    } catch (error) {
      setError(message(error));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function createBank(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = new FormData(event.currentTarget);
    try {
      const { bank } = await send<{ bank: Bank }>("/banks", {
        name: values.get("name"),
        description: values.get("description"),
        folder: values.get("folder"),
        ...(values.get("quizId") ? { quizId: values.get("quizId") } : {}),
      });
      setSelected(bank);
      setDirty(false);
      setCreate(false);
      await load();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function open(bank: Bank) {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ bank: Bank }>(`/banks/${bank.id}`);
      setSelected(data.bank);
      setDirty(false);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const { bank } = await send<{ bank: Bank }>(
        `/banks/${selected.id}`,
        {
          name: selected.name,
          description: selected.description,
          folder: selected.folder,
          questions: selected.questions,
        },
        "PUT",
      );
      setSelected(bank);
      setDirty(false);
      setNotice(`Bank version ${bank.latestVersion} saved.`);
      await load();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function sample(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    const values = new FormData(event.currentTarget);
    try {
      const { quiz } = await send<{ quiz: Quiz }>(
        `/banks/${selected.id}/sample`,
        {
          title: values.get("title"),
          questionCount: Number(values.get("questionCount")),
          difficulty: values.get("difficulty"),
          durationMinutes: values.get("duration")
            ? Number(values.get("duration"))
            : null,
        },
      );
      router.push(`/study/quizzes/${quiz.id}`);
    } catch (error) {
      setError(message(error));
      setBusy(false);
    }
  }
  function exportBank() {
    if (!selected) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { name: selected.name, questions: selected.questions },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selected.name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 70) || "question-bank"}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      {selected && (
        <Button
          variant="quiet"
          className="qb-back"
          onClick={() => {
            if (dirty) {
              setError("Save your bank changes before returning to the list.");
              return;
            }
            setSelected(null);
            setDeleteConfirm(false);
            setNotice("");
          }}
        >
          <ArrowLeft size={16} />
          All question banks
        </Button>
      )}
      <PageTitle
        title={selected ? selected.name : "Good questions, kept close."}
        description={
          selected
            ? `${quantity(selected.questions.length, "question")} · Version ${selected.latestVersion}${dirty ? " · Unsaved changes" : ""}`
            : "Build reusable question banks. Draw a fresh practice quiz whenever you need one."
        }
        action={
          selected ? (
            <>
              <Button variant="secondary" onClick={exportBank}>
                <Download size={16} />
                Export JSON
              </Button>
              <Button disabled={busy} onClick={save}>
                <Save size={16} />
                Save bank
              </Button>
            </>
          ) : (
            <Button onClick={() => setCreate(!create)}>
              <Plus size={17} />
              Create a bank
            </Button>
          )
        }
      />
      <ErrorMessage>{error}</ErrorMessage>
      {notice && <Notice>{notice}</Notice>}
      {create && !selected && (
        <form className="qb-inline-form" onSubmit={createBank}>
          <h2>A collection worth keeping</h2>
          <div className="qb-field-row">
            <Field label="Bank name">
              <input
                name="name"
                required
                maxLength={200}
                placeholder="e.g. Biology essentials"
              />
            </Field>
            <Field label="Folder (optional)">
              <input
                name="folder"
                maxLength={200}
                placeholder="e.g. Semester one"
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea name="description" maxLength={2000} rows={2} />
          </Field>
          <Field label="Start with an existing quiz">
            <select name="quizId">
              <option value="">Start an empty bank</option>
              {quizzes.map((quiz) => (
                <option value={quiz.id} key={quiz.id}>
                  {quiz.title} · {quantity(quiz.questionCount, "question")}
                </option>
              ))}
            </select>
          </Field>
          <Button disabled={busy} type="submit">
            Create bank <ArrowRight size={17} />
          </Button>
        </form>
      )}
      {selected ? (
        <div className="qb-builder-grid">
          <div>
            <div className="qb-field-row">
              <Field label="Bank name">
                <input
                  value={selected.name}
                  maxLength={200}
                  onChange={(event) => {
                    setSelected({ ...selected, name: event.target.value });
                    setDirty(true);
                  }}
                />
              </Field>
              <Field label="Folder">
                <input
                  value={selected.folder}
                  maxLength={200}
                  onChange={(event) => {
                    setSelected({ ...selected, folder: event.target.value });
                    setDirty(true);
                  }}
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                value={selected.description}
                rows={2}
                onChange={(event) => {
                  setSelected({ ...selected, description: event.target.value });
                  setDirty(true);
                }}
              />
            </Field>
            <Field label="Add questions from a quiz">
              <select
                defaultValue=""
                disabled={busy}
                onChange={async (event) => {
                  const quizId = event.target.value;
                  event.target.value = "";
                  if (!quizId) return;
                  setBusy(true);
                  try {
                    const { quiz } = await api<{ quiz: Quiz }>(
                      `/quizzes/${quizId}`,
                    );
                    if (
                      selected.questions.length + quiz.questions.length >
                      1000
                    )
                      throw new Error(
                        "A bank can hold at most 1,000 questions.",
                      );
                    setSelected((previous) =>
                      previous
                        ? {
                            ...previous,
                            questions: [
                              ...previous.questions,
                              ...quiz.questions.map((question) => ({
                                ...question,
                                id: crypto.randomUUID(),
                              })),
                            ],
                          }
                        : previous,
                    );
                    setDirty(true);
                  } catch (error) {
                    setError(message(error));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <option value="">Choose a quiz to add</option>
                {quizzes.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </option>
                ))}
              </select>
            </Field>
            {selected.questions.length ? (
              <div className="qb-bank-questions">
                {selected.questions.map((question, index) => (
                  <article key={question.id}>
                    <header>
                      <span>Question {index + 1}</span>
                      <Tag>{typeNames[question.type]}</Tag>
                      <Button
                        variant="quiet"
                        onClick={() => {
                          setSelected({
                            ...selected,
                            questions: selected.questions.filter(
                              (item) => item.id !== question.id,
                            ),
                          });
                          setDirty(true);
                        }}
                        aria-label={`Remove bank question ${index + 1}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </header>
                    <h3>{question.prompt}</h3>
                    <p>
                      {question.topic} · {question.difficulty} ·{" "}
                      {quantity(question.points, "point")}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="Give this bank a first question.">
                Add questions from one of your quizzes above, then save the
                bank.
              </Empty>
            )}
          </div>
          <aside className="qb-builder-settings">
            <form onSubmit={sample}>
              <h2>A fresh set of questions</h2>
              <p className="qb-muted qb-small">
                Draw from the saved bank version. Save any changes first.
              </p>
              <Field label="Practice quiz title">
                <input
                  name="title"
                  defaultValue={`${selected.name} · Practice`}
                  required
                  maxLength={200}
                />
              </Field>
              <Field label="Number of questions">
                <input
                  name="questionCount"
                  type="number"
                  min={1}
                  max={Math.min(100, selected.questions.length) || 1}
                  defaultValue={Math.min(10, selected.questions.length) || 1}
                  required
                />
              </Field>
              <Field label="Difficulty">
                <select name="difficulty">
                  <option value="mixed">Mixed</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </Field>
              <Field label="Time limit (minutes)">
                <input name="duration" type="number" min={1} max={1440} />
              </Field>
              <Button
                type="submit"
                disabled={busy || dirty || !selected.questions.length}
              >
                Create practice quiz <ArrowRight size={16} />
              </Button>
            </form>
            <div className="qb-delete-section">
              {deleteConfirm ? (
                <>
                  <p>Permanently delete this question bank?</p>
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api(`/banks/${selected.id}`, {
                          method: "DELETE",
                        });
                        setSelected(null);
                        setDirty(false);
                        setDeleteConfirm(false);
                        await load();
                      } catch (error) {
                        setError(message(error));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Delete permanently
                  </Button>
                  <Button
                    variant="quiet"
                    onClick={() => setDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="quiet" onClick={() => setDeleteConfirm(true)}>
                  <Trash2 size={16} />
                  Delete bank
                </Button>
              )}
            </div>
          </aside>
        </div>
      ) : !banks ? (
        <Loading label="Opening your question banks…" />
      ) : banks.length ? (
        <>
          <Field label="Filter by folder">
            <select
              value={folder}
              onChange={(event) => setFolder(event.target.value)}
            >
              <option value="">All folders</option>
              {[
                ...new Set(banks.map((bank) => bank.folder).filter(Boolean)),
              ].map((folder) => (
                <option key={folder}>{folder}</option>
              ))}
            </select>
          </Field>
          <div className="qb-course-list">
            {banks
              .filter((bank) => !folder || bank.folder === folder)
              .map((bank) => (
                <button
                  className="qb-bank-row"
                  key={bank.id}
                  onClick={() => open(bank)}
                  disabled={busy}
                >
                  <FolderOpen size={25} strokeWidth={1.4} />
                  <div>
                    <h3>{bank.name}</h3>
                    <p>
                      {bank.description ||
                        "A collection of questions for your next practice session."}
                    </p>
                    <small>
                      {bank.folder || "Unfiled"} ·{" "}
                      {quantity(bank.questionCount, "question")} · v
                      {bank.latestVersion} · {date(bank.updatedAt)}
                    </small>
                  </div>
                  <ArrowRight size={18} />
                </button>
              ))}
          </div>
        </>
      ) : (
        <Empty
          title="Keep the questions that count."
          action={
            <Button onClick={() => setCreate(true)}>
              Create your first bank <Plus size={17} />
            </Button>
          }
        >
          Gather questions from your quizzes into a reusable bank, then draw new
          practice sets by difficulty.
        </Empty>
      )}
    </>
  );
}
