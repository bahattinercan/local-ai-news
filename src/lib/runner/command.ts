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

/**
 * Geometry of the promo box's command specimen.
 *
 * Measured at 1440 px, 2026-10-18: the rail column is 276 px, the promo box
 * spends 2 px on its border and 32 px on `p-4`, and the code strip cancels 16 px
 * of that with `-mx-2` so it can afford `px-2` inside its own hairline. That
 * leaves 239 px of text at 11 px JetBrains Mono, which advances exactly 6.6 px
 * per character — 36 columns fit a line and the 37th wraps.
 *
 * The number is not decoration: at the 33 columns `px-2` alone allowed, the two
 * most downloaded models produced a three-line specimen whose third line was the
 * orphaned `t` of a 36-character repo id.
 */
export const RAIL_COLUMNS = 36;
/** Two lines are the advertisement; the box clamps at four as a backstop. */
export const RAIL_LINES = 2;

/**
 * How many lines a run of text needs in the promo box.
 *
 * The box wraps with `break-words`, not `break-all`: text breaks at its spaces
 * first and inside a token only when the token cannot fit a line by itself.
 * Modelling that matters because the *name* is a bad proxy for how a command
 * reads — `DMAD` is 4 characters with a 103-character command, and
 * `huggingface-cli download QuantFunc/Minimax-H3-Quantfunc-4bit` picked up a line
 * only for the orphaned `t` of a 36-character repo id.
 *
 * Used for both the command and the caption above it (the model name and its
 * figure share the same 11 px mono and the same 36 columns).
 */
export function railLines(text: string, columns: number = RAIL_COLUMNS): number {
  let lines = 1;
  let used = 0;

  for (const token of text.split(/\s+/).filter(Boolean)) {
    const gap = used === 0 ? 0 : 1;
    if (used + gap + token.length <= columns) {
      used += gap + token.length;
      continue;
    }
    /* A token that does not fit is broken across `ceil(len / columns)` lines. When
       it is the first token of a line the break starts on the line already open
       (`ceil - 1` new lines); otherwise it opens a new one first. */
    const chunks = Math.ceil(token.length / columns);
    lines += used === 0 ? chunks - 1 : chunks;
    const remainder = token.length % columns;
    /* `remainder === 0` means the token filled its last line exactly, so the next
       token must not share it. */
    used = remainder === 0 ? columns : remainder;
  }

  return lines;
}
