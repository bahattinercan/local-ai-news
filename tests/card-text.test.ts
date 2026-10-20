import { test } from "node:test";
import assert from "node:assert/strict";
import { CARD_EXCERPT_MAX, cardExcerpt, clampWords, markdownToText } from "../src/lib/card-text.ts";

const CARD = `---
license: apache-2.0
base_model: Qwen/Qwen3.8-27B
tags:
  - gguf
  - coding
---

# Qwen-Coder-Ninfer

<div align="center">
  <img src="https://example.com/logo.png" width="200"/>
</div>

[![Build](https://img.shields.io/badge/build-passing-green)](https://example.com/ci)
[![License](https://img.shields.io/badge/license-apache--2.0-blue)](https://example.com/license)

A 27B coding model quantised to GGUF for local inference, with a \`ninfer\` runtime
profile and *efficient thinking* traces.

## Benchmarks

| task | score |
|------|-------|
| HumanEval | 82.1 |

\`\`\`bash
llama-cli -m model.gguf -p "hello"
\`\`\`

Trained on a filtered code corpus; no instruction tuning beyond SFT.
`;

test("the YAML frontmatter never reaches the page", () => {
  const text = markdownToText(CARD);
  assert.ok(!text.includes("apache-2.0"), "license leaked from the frontmatter");
  assert.ok(!text.includes("base_model"), "frontmatter key leaked");
  assert.ok(!text.includes("gguf coding"), "frontmatter list leaked");
});

test("a leading blank line does not defeat the frontmatter strip", () => {
  // `realrebelai/MOSS-Imagine_ComfyUI` starts with `\n---`, so `startsWith("---")`
  // was false and the YAML list rendered as the first sentence of the excerpt.
  const text = markdownToText(`\n${CARD}`);
  assert.ok(!text.includes("apache-2.0"), "license leaked from the frontmatter");
  assert.ok(!text.includes("base_model"), "frontmatter key leaked");
  assert.ok(!text.includes("gguf coding"), "frontmatter list leaked");
  assert.strictEqual(text, markdownToText(CARD));
});

test("badges, HTML wrappers, tables and code blocks are dropped", () => {
  const text = markdownToText(CARD);
  assert.ok(!text.includes("<div"), "raw HTML survived");
  assert.ok(!text.includes("img.shields.io"), "badge URL survived");
  assert.ok(!text.includes("HumanEval"), "benchmark table survived");
  assert.ok(!text.includes("llama-cli"), "code block survived");
});

test("headings are dropped so the excerpt does not restate the repo id", () => {
  const text = markdownToText(CARD);
  assert.ok(!text.includes("#"), "heading marker survived");
  assert.ok(!text.startsWith("Qwen-Coder-Ninfer"), text.slice(0, 40));
});

test("the prose is kept, in reading order", () => {
  const text = markdownToText(CARD);
  assert.ok(text.startsWith("A 27B coding model quantised to GGUF"), text.slice(0, 60));
  assert.ok(text.includes("efficient thinking traces"), "inline markdown was lost");
  assert.ok(text.endsWith("no instruction tuning beyond SFT."), text.slice(-40));
  assert.ok(!text.includes("  "), "whitespace was not collapsed");
});

test("a card that is only badges and headings yields null, not an empty paragraph", () => {
  const empty = `---\nlicense: mit\n---\n\n# Name\n\n[![x](y)](z)\n\n| a | b |\n|---|---|\n`;
  assert.equal(cardExcerpt(empty), null);
});

test("an excerpt is clamped at a word boundary with an ellipsis", () => {
  const long = "word ".repeat(400);
  const excerpt = cardExcerpt(long, 100);
  assert.ok(excerpt !== null);
  assert.ok(excerpt.length <= 102, `excerpt was ${excerpt.length} chars`);
  assert.ok(excerpt.endsWith("…"));
  assert.ok(!/wor…$/.test(excerpt), "clamped mid-word");
});

test("clampWords leaves text that already fits untouched", () => {
  assert.equal(clampWords("short text", 100), "short text");
});

test("the default excerpt budget is applied", () => {
  const excerpt = cardExcerpt(`# t\n\n${"sentence about the model. ".repeat(80)}`);
  assert.ok(excerpt !== null && excerpt.length <= CARD_EXCERPT_MAX + 2);
});

const PAPER_CARD = `---
license: other
---

# DMAD: Distribution Matching as Adversarial Distillation

[![Project Page](https://img.shields.io/badge/Project-Page-yellow)](https://example.com)

[Zhengming Yu](https://example.com/yu)<sup>1,2</sup>,
[Junkun Yuan](https://example.com/yuan)<sup>2</sup><br/>
<sup>1</sup>Texas A&amp;M University, <sup>2</sup>ByteDance<br/>

This repository holds the 4-step students of MiniMax-H3 as LoRA adapters.
`;

test("inline HTML and entities never reach the page", () => {
  const text = markdownToText(PAPER_CARD);
  assert.ok(!text.includes("<sup>"), "inline HTML survived");
  assert.ok(!text.includes("<br"), "line break tag survived");
  assert.equal(markdownToText("Models &amp; datasets for &lt;tokens&gt;."), "Models & datasets for <tokens>.");
});

test("a leading author/affiliation block is dropped, not printed as the summary", () => {
  const text = markdownToText(PAPER_CARD);
  assert.ok(text.startsWith("This repository holds the 4-step students"), text.slice(0, 80));
  assert.ok(!text.includes("Junkun Yuan"), "author list survived");
});

test("the author-block rule only applies while it is leading", () => {
  const text = markdownToText(`# Model\n\nRuns locally on one GPU.\n\n[Ada Lovelace](https://x)<sup>1</sup>, [Alan Turing](https://y)<sup>2</sup>\n`);
  assert.ok(text.startsWith("Runs locally on one GPU."), text.slice(0, 60));
  assert.ok(text.includes("Ada Lovelace"), "prose that follows must not be swallowed");
});
