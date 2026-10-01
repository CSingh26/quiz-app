import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  OpenAICompatibleProvider,
  providerConfiguration,
} from "../../src/server/ai/provider";
import type { GenerationInput } from "../../src/server/ai/validation";

test("provider transport validates genuine JSON and fails closed on refusals, truncation and ungrounded content", async () => {
  const saved = {
    AI_BASE_URL: process.env.AI_BASE_URL,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_MODEL: process.env.AI_MODEL,
  };
  const request: GenerationInput = {
    materialIds: ["m1"],
    title: "Cells",
    questionCount: 1,
    difficulty: "easy",
    questionTypes: ["short_answer"],
    durationMinutes: null,
  };
  const question = {
    id: "q1",
    type: "short_answer",
    prompt: "What molecule stores energy?",
    choices: [],
    correctAnswer: "ATP",
    explanation: "ATP stores energy.",
    difficulty: "easy",
    topic: "Cells",
    points: 1,
    sourceRefs: [
      { chunkId: "c1", label: "page 1", quote: "ATP stores energy" },
    ],
    tags: [],
  };
  let reply: unknown = {
      choices: [
        {
          message: { content: JSON.stringify({ questions: [question] }) },
          finish_reason: "stop",
        },
      ],
    },
    status = 200,
    received = 0;
  const server = createServer(async (req, res) => {
    let text = "";
    for await (const bytes of req) text += bytes;
    const body = JSON.parse(text);
    assert.equal(req.url, "/v1/chat/completions");
    assert.equal(req.headers.authorization, "Bearer local-fixture-key");
    assert.equal(body.model, "fixture-model");
    assert.equal(body.response_format.type, "json_schema");
    assert.equal(body.response_format.json_schema.strict, true);
    assert.match(body.messages[1].content, /ATP stores energy/);
    received++;
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(reply));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    process.env.AI_BASE_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}/v1`;
    process.env.AI_API_KEY = "local-fixture-key";
    process.env.AI_MODEL = "fixture-model";
    assert.equal(providerConfiguration().configured, true);
    const provider = new OpenAICompatibleProvider(),
      context = [
        { id: "c1", label: "page 1", text: "ATP stores energy in cells." },
      ];
    assert.equal(
      (await provider.generate(request, context))[0].correctAnswer,
      "ATP",
    );
    for (const bad of [
      {
        choices: [
          { message: { refusal: "Cannot comply" }, finish_reason: "stop" },
        ],
      },
      {
        choices: [
          { message: { content: '{"questions":[' }, finish_reason: "length" },
        ],
      },
      {
        choices: [{ message: { content: "not JSON" }, finish_reason: "stop" }],
      },
      {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    ...question,
                    sourceRefs: [
                      {
                        chunkId: "c1",
                        label: "page 1",
                        quote: "Fabricated citation",
                      },
                    ],
                  },
                ],
              }),
            },
            finish_reason: "stop",
          },
        ],
      },
    ]) {
      reply = bad;
      await assert.rejects(() => provider.generate(request, context));
    }
    status = 429;
    reply = { error: { message: "private provider diagnostics" } };
    await assert.rejects(
      () => provider.generate(request, context),
      (error) =>
        error instanceof Error &&
        error.message.includes("429") &&
        !error.message.includes("private"),
    );
    assert.equal(received, 6);
    delete process.env.AI_API_KEY;
    assert.equal(providerConfiguration().configured, false);
    await assert.rejects(
      () => provider.generate(request, context),
      /not configured/,
    );
    assert.equal(received, 6);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
