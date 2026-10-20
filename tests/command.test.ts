import { test } from "node:test";
import assert from "node:assert/strict";
import { railLines, ggufQuantOf, runCommand } from "../src/lib/runner/command.ts";
import type { ClassifiedModel } from "../src/lib/model.ts";

function model(overrides: Partial<ClassifiedModel>): ClassifiedModel {
  return {
    externalId: "someone/model",
    name: "model",
    runners: [],
    quantizations: [],
    ...overrides
  } as ClassifiedModel;
}

/**
 * `quantizations` mixes GGUF schemes with safetensors dtypes and is sorted
 * alphabetically, so `[0]` was regularly "AWQ", "BF16" or even "I8" — none of
 * which is a valid llama.cpp/Ollama quant tag.
 */
test("only a GGUF quantization scheme is offered to a GGUF runner", () => {
  assert.equal(ggufQuantOf(model({ quantizations: ["AWQ", "BF16", "Q4_K_M"] })), "BF16");
  assert.equal(ggufQuantOf(model({ quantizations: ["I8", "U32", "F32"] })), "F32");
  assert.equal(ggufQuantOf(model({ quantizations: ["I8", "MLX-4BIT", "AWQ"] })), null);
});

/**
 * Regression: llama.cpp has no `--quant` flag (the Hub form is `-hf repo[:quant]`)
 * and `ollama pull <model name>` only worked for a model somebody had already
 * published to the Ollama library.
 */
test("the run command uses the real flag for each runner", () => {
  assert.equal(
    runCommand(model({ runners: ["llama.cpp"], quantizations: ["Q4_K_M"] })),
    "llama-cli -hf someone/model:Q4_K_M"
  );
  assert.equal(runCommand(model({ runners: ["llama.cpp"], quantizations: [] })), "llama-cli -hf someone/model");
  assert.equal(runCommand(model({ runners: ["Ollama"], quantizations: ["Q4_K_M"] })), "ollama run hf.co/someone/model:Q4_K_M");
  assert.equal(runCommand(model({ runners: ["vLLM"] })), "vllm serve someone/model");
  assert.equal(runCommand(model({ runners: ["MLX"] })), "mlx_lm.generate --model someone/model");
  // llama.cpp wins over Ollama when both are detected: it is the direct path.
  assert.equal(
    runCommand(model({ runners: ["Ollama", "llama.cpp"], quantizations: ["Q5_K_S"] })),
    "llama-cli -hf someone/model:Q5_K_S"
  );
  assert.match(runCommand(model({ runners: ["transformers"] })), /^from transformers import AutoModelForCausalLM/);
});

/**
 * The promo box prints one real command in the 276 px rail. It wraps at spaces
 * (`break-words`), so a repo id that does not fit one line is broken across two —
 * which is how `huggingface-cli download QuantFunc/Minimax-H3-Quantfunc-4bit`
 * ended up as a two-line specimen plus an orphaned `t`.
 */
test("a command is measured in rail lines, not in characters", () => {
  const m = (externalId: string, runners: string[]) => model({ externalId, runners, quantizations: [] });

  // 34 columns, comfortably inside a 36-column line.
  assert.equal(railLines("llama-cli -hf someone/model:Q4_K_M"), 1);
  // A 37-character token no longer fits one line and takes two of them.
  assert.equal(railLines(`${"x".repeat(37)}`), 2);
  assert.equal(railLines(`${"x".repeat(36)}`), 1);
  assert.equal(railLines("llama-cli -hf mradermacher/RsEvi-8B-i1-GGUF:Q1"), 2);

  // The two commands the hot list actually offers at the top: a 36-character repo
  // id is exactly the line, so the command is a clean two-line specimen — at the
  // 33 columns the box used to have it needed three lines, the last one holding a
  // single orphaned `t`.
  assert.equal(railLines(runCommand(m("QuantFunc/Minimax-H3-Quantfunc-4bit", ["ComfyUI"]))), 2);
  assert.equal(railLines(runCommand(m("pdmd2026/pdmd_4NFE_lora", ["ComfyUI"]))), 2);
  // One character more, and the repo id breaks across two lines.
  assert.equal(railLines(runCommand(m("Iwannapose/minimax_h3_pdmd_2nfe_comfyui", ["ComfyUI"]))), 3);

  // The transformers fallback is the worst case at four lines.
  assert.equal(railLines(runCommand(m("someone/model", ["transformers"]))), 4);

  // A repo id longer than a whole line is broken across as many as it needs.
  assert.equal(railLines("x".repeat(70)), 2);
});
