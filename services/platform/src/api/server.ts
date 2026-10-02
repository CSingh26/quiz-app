import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import { AppError } from "../server/errors";
import { errorResponse } from "../server/http";
import { createReadinessProbe } from "../server/readiness";

type Options = { ready?: () => Promise<unknown>; maxBodyBytes?: number };
const methods = new Set(["GET", "POST", "PUT", "DELETE"]);
function readBody(request: IncomingMessage, maximum: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let exceeded = false;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maximum) {
        if (!exceeded)
          reject(
            new AppError(
              "UPLOAD_TOO_LARGE",
              "This request exceeds the size limit.",
              413,
            ),
          );
        exceeded = true;
        chunks.length = 0;
      } else if (!exceeded) chunks.push(chunk);
    });
    request.on("end", () => {
      if (!exceeded) resolve(Buffer.concat(chunks));
    });
    request.on("error", reject);
    request.on("aborted", () =>
      reject(
        new AppError("REQUEST_ABORTED", "The request was interrupted.", 400),
      ),
    );
  });
}
async function writeResponse(outgoing: ServerResponse, response: Response) {
  outgoing.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key !== "set-cookie") outgoing.setHeader(key, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) outgoing.setHeader("set-cookie", cookies);
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}
export function createApiServer(
  handler: (request: Request) => Promise<Response>,
  options: Options = {},
) {
  const maximum = options.maxBodyBytes ?? 10 * 1024 * 1024 + 64 * 1024;
  const ready = createReadinessProbe(async () => options.ready?.());
  const server = createServer(
    {
      maxHeaderSize: 16 * 1024,
      requestTimeout: 30_000,
      headersTimeout: 10_000,
      keepAliveTimeout: 5_000,
    },
    async (incoming, outgoing) => {
      const requestId = randomUUID();
      try {
        const pathname = incoming.url?.split("?")[0];
        if (incoming.method === "GET" && pathname === "/healthz")
          return await writeResponse(
            outgoing,
            Response.json({ service: "quizbee-api", status: "alive" }),
          );
        if (incoming.method === "GET" && pathname === "/readyz") {
          try {
            if (!(await ready())) throw new Error("Dependency unavailable");
            return await writeResponse(
              outgoing,
              Response.json({ service: "quizbee-api", status: "ready" }),
            );
          } catch {
            return await writeResponse(
              outgoing,
              Response.json(
                { service: "quizbee-api", status: "unavailable" },
                { status: 503 },
              ),
            );
          }
        }
        if (!incoming.url?.startsWith("/api/v2/"))
          return await writeResponse(
            outgoing,
            Response.json(
              {
                error: {
                  code: "NOT_FOUND",
                  message: "This endpoint was not found.",
                },
              },
              { status: 404 },
            ),
          );
        if (!methods.has(incoming.method || ""))
          return await writeResponse(
            outgoing,
            new Response(null, {
              status: 405,
              headers: { allow: [...methods].join(", ") },
            }),
          );
        const advertised = Number(incoming.headers["content-length"] || 0);
        if (advertised > maximum)
          throw new AppError(
            "UPLOAD_TOO_LARGE",
            "This request exceeds the size limit.",
            413,
          );
        const headers = new Headers();
        for (const [key, value] of Object.entries(incoming.headers)) {
          if (value !== undefined)
            headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        }
        const body =
          incoming.method === "GET"
            ? undefined
            : await readBody(incoming, maximum);
        const request = new Request(`http://quizbee-api${incoming.url}`, {
          method: incoming.method,
          headers,
          body: body?.length ? new Uint8Array(body) : undefined,
        });
        await writeResponse(outgoing, await handler(request));
      } catch (error) {
        if (!outgoing.destroyed && !outgoing.headersSent) {
          outgoing.setHeader("connection", "close");
          await writeResponse(outgoing, errorResponse(error, requestId));
        } else outgoing.destroy();
      }
    },
  );
  server.maxRequestsPerSocket = 1000;
  return server;
}
