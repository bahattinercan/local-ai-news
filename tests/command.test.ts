import { test } from "node:test";
import assert from "node:assert/strict";
import { ggufQuantOf, runCommand } from "../src/lib/runner/command.ts";
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
