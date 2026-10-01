// Run explicitly against the local development web server and worker.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const origin = process.env.QUIZBEE_SMOKE_ORIGIN || "http://localhost:3018";
const url = new URL(origin);
assert.ok(
  ["localhost", "127.0.0.1"].includes(url.hostname) && url.port === "3018",
  "Use the local port 3018 preview.",
);
const password = "Local smoke fixture password 123";
const email = `smoke-${randomUUID()}@example.invalid`;
let cookie = "";
async function request(path, method = "GET", data) {
  const multipart = data instanceof FormData;
  const response = await fetch(`${origin}/api/v2${path}`, {
    method,
    headers: {
      origin,
      cookie,
      ...(data && !multipart ? { "content-type": "application/json" } : {}),
    },
    body: data ? (multipart ? data : JSON.stringify(data)) : undefined,
  });
  const body = await response.json();
  assert.ok(
    response.ok,
    `${method} ${path}: ${response.status} ${body.error?.code || ""}`,
  );
  return { response, body };
}
try {
  const registered = await request("/auth/register", "POST", {
    name: "Local smoke fixture",
    email,
    password,
  });
  cookie = registered.response.headers.get("set-cookie").split(";")[0];
  const form = new FormData();
  form.set(
    "file",
    new File(
      [
        "# Retrieval practice\n\nActive recall retrieves ideas from memory. Spaced practice separates study sessions over time.",
      ],
      "local-smoke-notes.md",
      { type: "text/markdown" },
    ),
  );
  const { body: uploaded } = await request("/materials", "POST", form);
  let material;
  for (let count = 0; count < 20; count += 1) {
    const { body } = await request("/materials");
    material = body.materials.find((item) => item.id === uploaded.material.id);
    if (material?.status === "ready" || material?.status === "failed") break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.equal(
    material?.status,
    "ready",
    "The development worker must process the upload.",
  );
  const { body } = await request(`/materials/${material.id}/chunks`);
  assert.ok(body.chunks.some((chunk) => chunk.text.includes("Active recall")));
  await request("/auth/send-verification", "POST", {});
  await request("/auth/forgot-password", "POST", { email });
  console.log(
    "Local HTTP upload → worker → private chunks passed; verification/reset mail accepted by local SMTP.",
  );
} finally {
  if (cookie) await request("/account", "DELETE", { password });
}
