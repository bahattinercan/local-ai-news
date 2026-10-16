import type { ClassifiedModel } from "../model.ts";

/**
 * `quantizations` mixes GGUF quantisation schemes with safetensors dtypes
 * (measured on the served snapshot: Q4_K_M, MLX-4BIT, BF16, I8, U32, AWQ …), and
 * they are sorted alphabetically. Only the first group can be handed to a GGUF
 * runner as `repo:quant`, so pick from it explicitly instead of taking `[0]`.
 */
const GGUF_QUANT = /^(IQ\d|Q\d|FP8|BF16|F16|F32|MXFP4)/i;

export function ggufQuantOf(model: ClassifiedModel): string | null {
  return model.quantizations.find((quant) => GGUF_QUANT.test(quant)) ?? null;
}

/**
 * A copy-paste command per detected runner.
 *
 * Correctness notes (these were wrong before):
 *  - llama.cpp has no `--quant` flag; the Hugging Face form is
 *    `llama-cli -hf <repo>[:<quant>]` (`-hff <file>` for one file).
 *  - Ollama pulls GGUF repos straight from the Hub as
 *    `ollama run hf.co/<repo>[:<quant>]`; `ollama pull <model name>` only ever
 *    worked for models someone had already published to the Ollama library.
 *  - A diffusers/ComfyUI checkpoint is fetched with the Hub CLI, not "loaded".
 */
export function runCommand(model: ClassifiedModel): string {
  const quant = ggufQuantOf(model);
  const ggufTarget = quant ? `${model.externalId}:${quant}` : model.externalId;

  if (model.runners.includes("llama.cpp")) return `llama-cli -hf ${ggufTarget}`;
  if (model.runners.includes("Ollama")) return `ollama run hf.co/${ggufTarget}`;
  if (model.runners.includes("ExLlama")) return `python -m exllamav2.server -m ${model.externalId}`;
  if (model.runners.includes("MLX")) return `mlx_lm.generate --model ${model.externalId}`;
  if (model.runners.includes("vLLM")) return `vllm serve ${model.externalId}`;
  if (model.runners.includes("ComfyUI")) return `huggingface-cli download ${model.externalId}`;
  return `from transformers import AutoModelForCausalLM; AutoModelForCausalLM.from_pretrained("${model.externalId}")`;
}
