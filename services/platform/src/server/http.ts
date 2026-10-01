import { ZodError } from "zod";
import { randomUUID } from "node:crypto";
import { AppError } from "./errors";

export async function boundedBody(request: Request, maxBytes = 1024 * 1024) {
  const advertised = Number(request.headers.get("content-length") ?? 0);
  if (advertised > maxBytes)
    throw new AppError(
      "UPLOAD_TOO_LARGE",
      "This request exceeds the size limit.",
      413,
    );
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new AppError(
        "UPLOAD_TOO_LARGE",
        "This request exceeds the size limit.",
        413,
      );
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

export async function jsonBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError("VALIDATION_ERROR", "Send this request as JSON.", 415);
  try {
    return JSON.parse(new TextDecoder().decode(await boundedBody(request)));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "VALIDATION_ERROR",
      "The request contains invalid JSON.",
    );
  }
}

export async function fileBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data;"))
    throw new AppError("VALIDATION_ERROR", "Choose a file to upload.", 415);
  const bytes = await boundedBody(request, 10 * 1024 * 1024 + 64 * 1024);
  let form: FormData;
  try {
    form = await new Response(bytes, {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    throw new AppError(
      "VALIDATION_ERROR",
      "The upload could not be read. Please choose the file again.",
    );
  }
  const files = form.getAll("file");
  if (
    files.length !== 1 ||
    !(files[0] instanceof File) ||
    Array.from(form.keys()).some((key) => key !== "file")
  )
    throw new AppError("VALIDATION_ERROR", "Upload one file at a time.");
  return files[0];
}

export function errorResponse(error: unknown, requestId: string) {
  if (error instanceof AppError)
    return Response.json(
      { error: { code: error.code, message: error.message }, requestId },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            error.issues[0]?.message ?? "Check the values and try again.",
        },
        requestId,
      },
      { status: 400 },
    );
  // Log error classes and request IDs only: Prisma messages can contain document data.
  console.error(
    JSON.stringify({
      event: "request.failed",
      requestId,
      errorType: error instanceof Error ? error.name : "Unknown",
    }),
  );
  return Response.json(
    {
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "QuizBee could not complete this request. Please try again.",
      },
      requestId,
    },
    { status: 503 },
  );
}

export function withHttp(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    const requestId = randomUUID();
    let response: Response;
    try {
      response = await handler(request);
    } catch (error) {
      response = errorResponse(error, requestId);
    }
    response.headers.set("X-Request-Id", requestId);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  };
}
