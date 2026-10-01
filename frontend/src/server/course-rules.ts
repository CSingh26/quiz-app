import { z } from "zod";

export const courseSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(2000).default(""),
  })
  .strict();
export const assignmentSchema = z
  .object({
    quizId: z.string().min(1).max(100),
    title: z.string().trim().min(2).max(160),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    durationMinutes: z.number().int().min(1).max(1440),
    attemptLimit: z.number().int().min(1).max(20),
    accessCode: z.string().trim().min(4).max(100).optional(),
    allowBacktracking: z.boolean(),
    integrityEnabled: z.boolean(),
  })
  .strict()
  .refine((body) => new Date(body.startsAt) < new Date(body.endsAt), {
    message: "The end time must be after the start time.",
    path: ["endsAt"],
  });

export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
