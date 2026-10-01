import { isIP } from "node:net";

/** The web tier forwards only this HTTP contract; it has no platform data access. */
export const MAX_REQUEST_BYTES = 10 * 1024 * 1024 + 64 * 1024;
export const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
const MAX_HEADER_BYTES = 16 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;
const REQUEST_HEADERS = ["accept", "content-type", "cookie", "origin"];
const RESPONSE_HEADERS = [
  "cache-control",
  "content-type",
  "content-disposition",
  "etag",
  "expires",
  "last-modified",
  "pragma",
  "retry-after",
  "vary",
  "x-request-id",
];
const METHODS = new Set([
  "GET",
  "HEAD",
  "OPTIONS",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

type ProxyOptions = { apiUrl?: string; timeoutMs?: number };
class ProxyInputError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
function failure(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "cache-control": "no-store" } },
  );
}
function unavailable() {
  return failure(
    503,
    "PLATFORM_UNAVAILABLE",
    "The study service is temporarily unavailable. Please try again shortly.",
  );
}
function destination(request: Request, configured: string) {
  const base = new URL(configured);
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  )
    throw new Error("Invalid platform origin");
  const incoming = new URL(request.url);
  const path = incoming.pathname;
  if (incoming.href.length > 8192)
    throw new ProxyInputError(
      414,
      "REQUEST_TOO_LARGE",
      "The request URL is too long.",
    );
  if (!path.startsWith("/api/v2/"))
    throw new ProxyInputError(
      400,
      "INVALID_PATH",
      "This platform path is not supported.",
    );
  const parts = path.slice("/api/v2/".length).split("/");
  if (
    parts.length > 3 ||
    parts.some((part) => !/^[a-zA-Z0-9_-]{1,100}$/.test(part))
  )
    throw new ProxyInputError(
      400,
      "INVALID_PATH",
      "This platform path is not supported.",
    );
  // Assign path/search rather than resolving an untrusted string against the origin.
  base.pathname = path;
  base.search = incoming.search;
  return base;
}
function hopHeaders(headers: Headers) {
  return new Set(
    (headers.get("connection") || "")
      .split(",")
      .map((value) => value.trim().toLowerCase()),
  );
}
function allowHeaders(source: Headers, names: string[]) {
  const result = new Headers();
  const hop = hopHeaders(source);
  let size = 0;
  for (const name of names) {
    const value = source.get(name);
    if (value === null || hop.has(name)) continue;
    size += new TextEncoder().encode(name + value).byteLength;
    if (size > MAX_HEADER_BYTES)
      throw new ProxyInputError(
        431,
        "HEADERS_TOO_LARGE",
        "The request headers are too large.",
      );
    result.set(name, value);
  }
  return result;
}
function forwardTrustedClient(source: Headers, destination: Headers) {
  const setting = process.env.TRUST_PLATFORM_PROXY;
  if (setting === undefined || setting === "false") return;
  if (setting !== "true") throw new Error("Invalid proxy trust configuration");
  // Opt in only behind an ingress that overwrites this header with one peer IP.
  // The web/API ports must not be directly reachable by untrusted clients.
  const address = source.get("x-forwarded-for")?.trim() || "";
  const version = isIP(address);
  if (
    !version ||
    address.includes("%") ||
    hopHeaders(source).has("x-forwarded-for")
  )
    throw new ProxyInputError(
      400,
      "INVALID_CLIENT_ADDRESS",
      "The request did not contain a valid trusted client address.",
    );
  const normalized =
    version === 6
      ? new URL(`http://[${address}]`).hostname.slice(1, -1)
      : address;
  destination.set("x-forwarded-for", normalized);
}
async function readBounded(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
  signal: AbortSignal,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  let abort: () => void = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    abort = () => reject(new Error("Proxy operation interrupted"));
    signal.addEventListener("abort", abort, { once: true });
  });
  try {
    if (signal.aborted) throw new Error("Proxy operation interrupted");
    while (true) {
      const part = await Promise.race([reader.read(), interrupted]);
      if (part.done) break;
      length += part.value.byteLength;
      if (length > limit)
        throw new ProxyInputError(
          413,
          "BODY_TOO_LARGE",
          "The request exceeds the 10 MB upload limit.",
        );
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}

export async function proxyPlatformRequest(
  request: Request,
  options: ProxyOptions = {},
): Promise<Response> {
  const controller = new AbortController();
  const clientAbort = () => controller.abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const apiUrl =
      options.apiUrl ?? process.env.PLATFORM_API_URL ?? "http://127.0.0.1:4010";
    const upstreamUrl = destination(request, apiUrl);
    const timeout =
      options.timeoutMs ??
      (process.env.PLATFORM_API_TIMEOUT_MS === undefined
        ? DEFAULT_TIMEOUT_MS
        : Number(process.env.PLATFORM_API_TIMEOUT_MS));
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 60_000)
      return unavailable();
    if (!METHODS.has(request.method))
      return failure(
        405,
        "METHOD_NOT_ALLOWED",
        "This request method is not supported.",
      );
    timer = setTimeout(() => controller.abort(), timeout);
    request.signal.addEventListener("abort", clientAbort, { once: true });
    if (request.signal.aborted) controller.abort();
    const headers = allowHeaders(request.headers, REQUEST_HEADERS);
    forwardTrustedClient(request.headers, headers);
    const declaredLength = request.headers.get("content-length");
    if (
      declaredLength !== null &&
      (!/^\d+$/.test(declaredLength) ||
        !Number.isSafeInteger(Number(declaredLength)))
    )
      throw new ProxyInputError(
        400,
        "INVALID_BODY",
        "The request body length is invalid.",
      );
    if (Number(declaredLength) > MAX_REQUEST_BYTES)
      throw new ProxyInputError(
        413,
        "BODY_TOO_LARGE",
        "The request exceeds the 10 MB upload limit.",
      );
    if (
      request.headers.has("content-encoding") &&
      request.headers.get("content-encoding") !== "identity"
    )
      throw new ProxyInputError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Compressed request bodies are not supported.",
      );
    const contentType = (headers.get("content-type") || "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    const acceptsBody = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    if (
      request.body &&
      (!acceptsBody ||
        !(
          contentType === "application/json" ||
          (contentType === "multipart/form-data" &&
            request.method === "POST" &&
            upstreamUrl.pathname === "/api/v2/materials")
        ))
    )
      throw new ProxyInputError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Use JSON for platform requests or multipart form data for material uploads.",
      );
    const body = acceptsBody
      ? await readBounded(request.body, MAX_REQUEST_BYTES, controller.signal)
      : undefined;
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: body?.byteLength ? body : undefined,
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });
    let responseBody: Uint8Array<ArrayBuffer> | null;
    try {
      responseBody =
        request.method === "HEAD" || [204, 205, 304].includes(upstream.status)
          ? null
          : await readBounded(
              upstream.body,
              MAX_RESPONSE_BYTES,
              controller.signal,
            );
    } catch {
      controller.abort();
      return unavailable();
    }
    const responseHeaders = allowHeaders(upstream.headers, RESPONSE_HEADERS);
    if (!responseHeaders.has("cache-control"))
      responseHeaders.set("cache-control", "no-store");
    if (!hopHeaders(upstream.headers).has("set-cookie"))
      for (const cookie of upstream.headers.getSetCookie())
        responseHeaders.append("set-cookie", cookie);
    return new Response(responseBody, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    if (error instanceof ProxyInputError)
      return failure(error.status, error.code, error.message);
    return unavailable();
  } finally {
    if (timer) clearTimeout(timer);
    request.signal.removeEventListener("abort", clientAbort);
  }
}
