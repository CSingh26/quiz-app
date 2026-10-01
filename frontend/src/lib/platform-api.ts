export type User = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  emailVerified?: boolean;
};
export type Answer = string | number | string[] | Record<string, string>;
export type QuestionType =
  | "single_choice"
  | "multiple_select"
  | "true_false"
  | "short_answer"
  | "numeric"
  | "fill_blank"
  | "matching"
  | "ordering"
  | "essay";
export type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  choices: { id: string; text: string }[];
  matchingTargets?: string[];
  correctAnswer?: Answer;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  points: number;
  tolerance?: number;
  sourceRefs?: { chunkId: string; label: string; quote: string }[];
  tags?: string[];
};
export type QuizSettings = {
  durationMinutes: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  mode: "practice" | "exam";
  showExplanations: boolean;
};
export type Quiz = {
  id: string;
  title: string;
  description: string;
  mode: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  latestVersion: number;
  questions: Question[];
  settings: QuizSettings;
};
export type Review = {
  questionId: string;
  prompt: string;
  answer: Answer;
  correctAnswer: Answer;
  explanation: string;
  topic: string;
  earned: number | null;
  points: number;
  sourceRefs?: { chunkId: string; label: string; quote: string }[];
};
export type Attempt = {
  id: string;
  quizId: string;
  title: string;
  status: "in_progress" | "submitted" | "expired";
  mode: string;
  questions: Question[];
  answers: Record<string, Answer>;
  flagged: string[];
  revision: number;
  startedAt: string;
  expiresAt: string | null;
  serverNow: string;
  score: number | null;
  maxScore: number;
  percentage: number | null;
  submittedAt: string | null;
  review?: Review[];
  allowBacktracking: boolean;
  integrityEnabled: boolean;
  currentQuestionIndex?: number;
  pendingReview?: boolean;
};
export type Course = {
  id: string;
  name: string;
  description: string;
  code: string;
  memberCount: number;
  createdAt: string;
  ownerId?: string;
  canManage?: boolean;
};
export type Assignment = {
  id: string;
  quizId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  attemptLimit: number;
  allowBacktracking: boolean;
  integrityEnabled: boolean;
  questionCount: number;
  courseName?: string;
  requiresAccessCode?: boolean;
};
export type Material = {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  createdAt: string;
  error?: string;
  chunkCount: number;
};
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/v2${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      data?.error?.message ||
        "This request could not be completed. Please try again.",
      data?.error?.code || "REQUEST_FAILED",
      response.status,
    );
  return data as T;
}
export const send = <T>(path: string, body: unknown = {}, method = "POST") =>
  api<T>(path, { method, body: JSON.stringify(body) });
export const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
export const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
export const answerText = (answer?: Answer | null): string =>
  answer == null || answer === ""
    ? "Not answered"
    : Array.isArray(answer)
      ? answer.join(", ")
      : typeof answer === "object"
        ? Object.entries(answer)
            .map(([key, value]) => `${key}: ${value}`)
            .join("; ")
        : String(answer);
export const typeNames: Record<QuestionType, string> = {
  single_choice: "Single choice",
  multiple_select: "Multiple select",
  true_false: "True or false",
  short_answer: "Short answer",
  numeric: "Numeric",
  fill_blank: "Fill in the blank",
  matching: "Matching",
  ordering: "Ordering",
  essay: "Essay",
};

export const quantity = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;
