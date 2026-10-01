import test from "node:test";
import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import * as storage from "../../src/server/ingestion/storage";

async function serverFor(
  work: (
    request: IncomingMessage,
    response: ServerResponse,
  ) => void | Promise<void>,
) {
  const server = createServer((request, response) => {
    void work(request, response);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    env: {
      STORAGE_DRIVER: "s3",
      S3_BUCKET: "quizbee-storage-test",
      S3_REGION: "us-east-1",
      S3_ENDPOINT: `http://127.0.0.1:${address.port}`,
      S3_FORCE_PATH_STYLE: "true",
      S3_PREFIX: "fixture/",
      AWS_ACCESS_KEY_ID: "local-test-key",
      AWS_SECRET_ACCESS_KEY: "local-test-secret",
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

test("storage configuration fails closed instead of silently using local files", () => {
  assert.equal(typeof storage.createPrivateStorage, "function");
  assert.equal(storage.createPrivateStorage({}), storage.localStorage);
  for (const env of [
    { STORAGE_DRIVER: "unknown" },
    { STORAGE_DRIVER: "s3" },
    {
      STORAGE_DRIVER: "s3",
      S3_BUCKET: "private",
      S3_REGION: "us-east-1",
      S3_ENDPOINT: "file:///tmp/data",
    },
    {
      STORAGE_DRIVER: "s3",
      S3_BUCKET: "private",
      S3_REGION: "us-east-1",
      S3_PREFIX: "../escape",
    },
  ])
    assert.throws(() => storage.createPrivateStorage(env));
});

test("S3 adapter round trips private opaque objects and deletion is idempotent", async () => {
  const objects = new Map<string, Buffer>();
  const transport = await serverFor(async (request, response) => {
    const key = request.url!;
    assert.match(key, /^\/quizbee-storage-test\/fixture\/[a-f0-9-]{36}\.bin/);
    assert.ok(request.headers.authorization);
    assert.equal(request.headers["x-amz-acl"], undefined);
    if (request.method === "PUT") {
      assert.equal(request.headers["if-none-match"], "*");
      const parts = [];
      for await (const part of request) parts.push(part);
      objects.set(key.split("?")[0], Buffer.concat(parts));
      response.writeHead(200).end();
    } else if (request.method === "GET") {
      const bytes = objects.get(key.split("?")[0]);
      if (!bytes)
        response.writeHead(404).end("<Error><Code>NoSuchKey</Code></Error>");
      else
        response.writeHead(200, { "content-length": bytes.length }).end(bytes);
    } else {
      objects.delete(key.split("?")[0]);
      response.writeHead(204).end();
    }
  });
  try {
    const adapter = storage.createPrivateStorage(transport.env);
    const key = await adapter.put(Buffer.from("private notes"));
    assert.match(key, /^[a-f0-9-]{36}\.bin$/);
    assert.equal((await adapter.read(key)).toString(), "private notes");
    await adapter.delete(key);
    await adapter.delete(key);
    await assert.rejects(adapter.read(key));
    assert.equal(objects.size, 0);
  } finally {
    await transport.close();
  }
});

test("S3 reads enforce actual byte limits even when the server omits a length", async () => {
  const transport = await serverFor((_request, response) => {
    response.writeHead(200);
    response.end(Buffer.alloc(10 * 1024 * 1024 + 1, 65));
  });
  try {
    const adapter = storage.createPrivateStorage(transport.env);
    await assert.rejects(
      adapter.read(`${randomUUID()}.bin`),
      /stored material|size/i,
    );
    await assert.rejects(adapter.put(Buffer.alloc(0)));
    await assert.rejects(adapter.put(Buffer.alloc(10 * 1024 * 1024 + 1)));
    await assert.rejects(adapter.read("../private-key"));
  } finally {
    await transport.close();
  }
});

test("S3 timeouts and permission failures are bounded and do not expose response secrets", async () => {
  let denied = false;
  const transport = await serverFor((_request, response) => {
    if (denied)
      response
        .writeHead(403)
        .end(
          "<Error><Code>AccessDenied</Code><Message>SYNTHETIC_SECRET_MARKER</Message></Error>",
        );
  });
  try {
    const adapter = storage.createPrivateStorage({
      ...transport.env,
      S3_REQUEST_TIMEOUT_MS: "100",
    });
    const started = Date.now();
    await assert.rejects(
      adapter.read(`${randomUUID()}.bin`),
      (error: Error) => !error.message.includes("SYNTHETIC_SECRET_MARKER"),
    );
    assert.ok(Date.now() - started < 2500);
    denied = true;
    await assert.rejects(
      adapter.delete(`${randomUUID()}.bin`),
      (error: Error) => !error.message.includes("SYNTHETIC_SECRET_MARKER"),
    );
  } finally {
    await transport.close();
  }
});
