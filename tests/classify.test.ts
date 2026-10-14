import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyModel, PRIMARY_PRECEDENCE } from "../src/lib/classify/rules.ts";

const fixtures = JSON.parse(
  readFileSync(join(process.cwd(), "tests", "fixtures", "classify-fixtures.json"), "utf-8")
) as Array<{ id: string; pipelineTag: string | null; tags: string[]; expected: string }>;

test("classify-check: 40 fixture models map to the expected category", () => {
  assert.equal(fixtures.length, 40);

  for (const fixture of fixtures) {
    const { primary } = classifyModel({
      externalId: fixture.id,
      pipelineTag: fixture.pipelineTag,
      name: fixture.id.split("/")[1] ?? fixture.id,
      author: fixture.id.split("/")[0],
      tags: fixture.tags
    });

    assert.equal(primary, fixture.expected, `${fixture.id} -> ${primary}, expected ${fixture.expected}`);
  }
});

test("coding precedence beats language when both match", () => {
  const { primary, all } = classifyModel({
    externalId: "JetBrains/Mellum2.1",
    pipelineTag: "text-generation",
    name: "Mellum2.1",
    author: "JetBrains",
    tags: ["coding"]
  });

  assert.equal(primary, "coding");
  assert.ok(all.includes("llm"));
  assert.equal(PRIMARY_PRECEDENCE[0], "coding");
});

test("category_overrides wins over rules", () => {
  const { primary } = classifyModel(
    { externalId: "Qwen/Qwen3-8B", pipelineTag: "text-generation", name: "Qwen3-8B", tags: [] },
    { "Qwen/Qwen3-8B": "coding" }
  );
  assert.equal(primary, "coding");
});

test("null pipeline_tag falls back to tag hints", () => {
  const gguf = classifyModel({ externalId: "a/b-gguf", pipelineTag: null, name: "b-gguf", tags: ["gguf"] });
  assert.equal(gguf.primary, "llm");

  const lora = classifyModel({ externalId: "a/b", pipelineTag: null, name: "b", tags: ["lora"] });
  assert.equal(lora.primary, "image");
});
