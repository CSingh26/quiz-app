"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  api,
  send,
  date,
  message,
  typeNames,
  type Material,
} from "@/lib/platform-api";
import {
  ActionLink,
  Button,
  Empty,
  ErrorMessage,
  Field,
  Loading,
  Notice,
  PageTitle,
  Tag,
} from "./ui";
type Chunk = { id: string; text: string; label: string };
export function MaterialsScreen() {
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Material | null>(null);
  const [chunks, setChunks] = useState<Chunk[] | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const load = useCallback(
    () =>
      api<{ materials: Material[] }>("/materials")
        .then((data) => setMaterials(data.materials))
        .catch((error) => setError(message(error))),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (
      !materials?.some((material) =>
        ["queued", "processing"].includes(material.status),
      )
    )
      return;
    const timer = setTimeout(() => void load(), 3000);
    return () => clearTimeout(timer);
  }, [materials, load]);
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    setNotice("");
    const body = new FormData();
    body.append("file", file);
    try {
      await api("/materials", { method: "POST", body });
      setNotice(
        `${file.name} was uploaded. Extraction continues in the background.`,
      );
      await load();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  async function inspect(material: Material) {
    setSelected(material);
    setChunks(null);
    setError("");
    try {
      const data = await api<{ chunks: Chunk[] }>(
        `/materials/${material.id}/chunks`,
      );
      setChunks(data.chunks);
    } catch (error) {
      setError(message(error));
    }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      await api(`/materials/${id}`, { method: "DELETE" });
      setDeleteId(null);
      if (selected?.id === id) {
        setSelected(null);
        setChunks(null);
      }
      await load();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Study materials"
        description="The pages, notes, and ideas behind your next good question."
        action={
          <ActionLink href="/study/generate" secondary>
            <Sparkles size={17} />
            Generate a quiz
          </ActionLink>
        }
      />
      <ErrorMessage>{error}</ErrorMessage>
      {notice && (
        <Notice>
          <CheckCircle2 size={18} />
          {notice}
        </Notice>
      )}
      <section
        className={`qb-upload-zone ${busy ? "is-busy" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!busy) void upload(event.dataTransfer.files[0]);
        }}
      >
        <Upload size={29} strokeWidth={1.4} />
        <div>
          <h2>Bring something you’re learning.</h2>
          <p>
            Drop a document here, or choose a file. Extraction runs in the
            background.
          </p>
          <small>
            PDF, text, Markdown, Word, PowerPoint, spreadsheets, and ZIP
            collections. Up to 10 MB per file. Files are validated before
            processing.
          </small>
        </div>
        <label className="qb-button qb-button-secondary qb-file-button">
          <Plus size={17} />
          {busy ? "Uploading…" : "Choose a file"}
          <input
            ref={input}
            type="file"
            disabled={busy}
            onChange={(event) => upload(event.target.files?.[0])}
            aria-label="Upload study material"
            accept=".pdf,.txt,.md,.docx,.pptx,.csv,.xlsx,.zip"
          />
        </label>
      </section>
      {!materials ? (
        <Loading label="Opening your materials…" />
      ) : !materials.length ? (
        <Empty title="A place for your source material.">
          Upload a file to see its extracted passages here. Your materials stay
          in your workspace.
        </Empty>
      ) : (
        <div className="qb-material-list">
          {materials.map((material) => (
            <article key={material.id}>
              <FileText size={24} strokeWidth={1.4} />
              <div className="qb-row-main">
                <h3>{material.name}</h3>
                <p>
                  {(material.size / 1024).toFixed(0)} KB · Added{" "}
                  {date(material.createdAt)}
                  {material.status === "ready"
                    ? ` · ${material.chunkCount} passages`
                    : ""}
                </p>
                {material.error && (
                  <p className="qb-error-text">{material.error}</p>
                )}
              </div>
              <Tag tone={material.status === "ready" ? "success" : ""}>
                {["queued", "processing"].includes(material.status) && (
                  <LoaderCircle size={12} className="qb-spin" />
                )}
                {material.status}
              </Tag>
              <div className="qb-inline-actions">
                {material.status === "ready" && (
                  <Button variant="quiet" onClick={() => inspect(material)}>
                    Read passages <ArrowRight size={15} />
                  </Button>
                )}
                {deleteId === material.id ? (
                  <>
                    <Button
                      variant="danger"
                      disabled={busy}
                      onClick={() => remove(material.id)}
                    >
                      Delete permanently
                    </Button>
                    <Button variant="quiet" onClick={() => setDeleteId(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="quiet"
                    aria-label={`Delete ${material.name}`}
                    onClick={() => setDeleteId(material.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <section className="qb-source-reader">
          <header>
            <div>
              <h2>{selected.name}</h2>
              <p>
                Extracted passages · Check the text before generating a quiz.
              </p>
            </div>
            <Button
              variant="quiet"
              aria-label="Close passages"
              onClick={() => setSelected(null)}
            >
              <X size={20} />
            </Button>
          </header>
          {chunks ? (
            chunks.length ? (
              chunks.map((chunk) => (
                <article key={chunk.id}>
                  <h3>{chunk.label}</h3>
                  <p>{chunk.text}</p>
                </article>
              ))
            ) : (
              <Notice>
                No readable passages were extracted from this file.
              </Notice>
            )
          ) : (
            <Loading label="Reading passages…" />
          )}
        </section>
      )}
    </>
  );
}
type Job = {
  id: string;
  status: string;
  progress: number;
  error?: string;
  resultQuizId?: string;
};
export function GenerateScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<{
    configured: boolean;
    provider: string | null;
  } | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>(["single_choice"]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  useEffect(() => {
    Promise.all([
      api<{ configured: boolean; provider: string | null }>(
        "/generation/config",
      ),
      api<{ materials: Material[] }>("/materials"),
    ])
      .then(([config, data]) => {
        setConfig(config);
        setMaterials(
          data.materials.filter((material) => material.status === "ready"),
        );
        const jobId = sessionStorage.getItem("quizbee-generation-job");
        if (jobId)
          api<{ job: Job }>(`/jobs/${jobId}`)
            .then((data) => setJob(data.job))
            .catch(() => sessionStorage.removeItem("quizbee-generation-job"));
      })
      .catch((error) => setError(message(error)));
  }, []);
  useEffect(() => {
    if (!job || !["queued", "running"].includes(job.status)) return;
    const timer = setTimeout(() => {
      api<{ job: Job }>(`/jobs/${job.id}`)
        .then((data) => {
          setJob(data.job);
          if (["completed", "failed"].includes(data.job.status))
            sessionStorage.removeItem("quizbee-generation-job");
        })
        .catch((error) => setError(message(error)));
    }, 2500);
    return () => clearTimeout(timer);
  }, [job]);
  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length || selected.length > 10 || !types.length) {
      setError("Choose 1–10 materials and at least one question type.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    if (Number(form.get("questionCount")) < types.length) {
      setError("Choose at least as many questions as question types.");
      setBusy(false);
      return;
    }
    try {
      const { job } = await send<{ job: Job }>("/generation", {
        materialIds: selected,
        title: form.get("title"),
        questionCount: Number(form.get("questionCount")),
        difficulty: form.get("difficulty"),
        questionTypes: types,
        durationMinutes: form.get("duration")
          ? Number(form.get("duration"))
          : null,
        topics: form.get("topics") || "",
      });
      setJob(job);
      sessionStorage.setItem("quizbee-generation-job", job.id);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Start with your sources."
        description="Generate a quiz draft from material you’ve read. Then make it your own."
      />
      <ErrorMessage>{error}</ErrorMessage>
      {!config ? (
        <Loading label="Checking generation availability…" />
      ) : !config.configured ? (
        <section className="qb-provider-unavailable">
          <Sparkles size={34} strokeWidth={1.3} />
          <h2>A provider makes this part possible.</h2>
          <p>
            Quiz generation is not configured in this workspace yet. No
            questions will be invented or simulated. You can still upload
            materials and build a quiz by hand.
          </p>
          <div className="qb-inline-actions">
            <ActionLink href="/study/quizzes/new">
              Write a quiz <ArrowRight size={16} />
            </ActionLink>
            <ActionLink href="/study/materials" secondary>
              Organize materials
            </ActionLink>
          </div>
          <p className="qb-small">
            A workspace operator can connect an AI provider in the server
            configuration.
          </p>
        </section>
      ) : (
        <>
          <Notice>
            Generation uses {config.provider || "the configured provider"}.
            Selected source passages are sent to this provider. Review generated
            questions and source references before use.
          </Notice>
          {job && (
            <section className="qb-job">
              <div className="qb-section-heading">
                <h2>
                  {job.status === "completed"
                    ? "Your draft is ready."
                    : job.status === "failed"
                      ? "Generation needs attention."
                      : "Putting your sources to work…"}
                </h2>
                <Tag>{job.status}</Tag>
              </div>
              {["queued", "running"].includes(job.status) && (
                <>
                  <progress
                    value={job.progress || 0}
                    max={100}
                    aria-label="Quiz generation progress"
                  />
                  <p className="qb-muted">
                    You can leave this page. We’ll reconnect to this job when
                    you return.
                  </p>
                </>
              )}
              {job.error && <ErrorMessage>{job.error}</ErrorMessage>}
              {job.resultQuizId && (
                <Button
                  onClick={() =>
                    router.push(`/study/quizzes/${job.resultQuizId}`)
                  }
                >
                  Review your draft <ArrowRight size={17} />
                </Button>
              )}
            </section>
          )}
          <form onSubmit={generate} className="qb-generation-form">
            <div>
              <h2>Choose your material</h2>
              {materials.length ? (
                <div className="qb-material-picker">
                  {materials.map((material) => (
                    <label key={material.id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(material.id)}
                        onChange={(event) =>
                          setSelected((previous) =>
                            event.target.checked
                              ? [...previous, material.id]
                              : previous.filter((id) => id !== material.id),
                          )
                        }
                      />
                      <FileText size={20} />
                      <span>
                        <strong>{material.name}</strong>
                        <small>{material.chunkCount} source passages</small>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Your sources come first."
                  action={
                    <ActionLink href="/study/materials">
                      Upload material <Upload size={16} />
                    </ActionLink>
                  }
                >
                  Add a document and wait for extraction to finish before
                  generating a quiz.
                </Empty>
              )}
              <Field label="Quiz title">
                <input
                  name="title"
                  placeholder="e.g. Introduction to human anatomy"
                  required
                  maxLength={160}
                />
              </Field>
              <Field
                label="Topics to focus on"
                hint="Optional. Give the draft a little direction."
              >
                <textarea
                  name="topics"
                  rows={3}
                  maxLength={1000}
                  placeholder="Key definitions, main arguments, or a chapter to revisit…"
                />
              </Field>
            </div>
            <aside>
              <h2>Shape your practice</h2>
              <div className="qb-field-row">
                <Field label="Questions">
                  <input
                    name="questionCount"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={10}
                    required
                  />
                </Field>
                <Field label="Difficulty">
                  <select name="difficulty" defaultValue="mixed">
                    <option value="mixed">Mixed</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </Field>
              </div>
              <Field
                label="Time limit in minutes"
                hint="Leave blank for untimed practice."
              >
                <input name="duration" type="number" min={1} max={600} />
              </Field>
              <fieldset className="qb-type-picker">
                <legend>Question types</legend>
                {Object.entries(typeNames).map(([type, name]) => (
                  <label className="qb-check" key={type}>
                    <input
                      type="checkbox"
                      checked={types.includes(type)}
                      onChange={(event) =>
                        setTypes((previous) =>
                          event.target.checked
                            ? [...previous, type]
                            : previous.filter((value) => value !== type),
                        )
                      }
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </fieldset>
              <Button
                type="submit"
                className="qb-full"
                disabled={
                  busy ||
                  !materials.length ||
                  (!!job && ["queued", "running"].includes(job.status))
                }
              >
                <Sparkles size={18} />
                {busy ? "Starting generation…" : "Generate draft"}
              </Button>
            </aside>
          </form>
        </>
      )}
    </>
  );
}
