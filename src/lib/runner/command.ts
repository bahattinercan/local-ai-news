import type { ClassifiedModel } from "../model.ts";

export function runCommand(model: ClassifiedModel): string {
  const short = model.name.toLowerCase();

  if (model.runners.includes("Ollama")) return `ollama pull ${short}`;
  if (model.runners.includes("llama.cpp")) {
    const file = model.quantizations[0] ?? "model.gguf";
    return `llama-cli -hf ${model.externalId} ${model.quantizations.length ? `--quant ${file}` : ""}`.trim();
  }
  if (model.runners.includes("MLX")) return `mlx_lm.generate --model ${model.externalId}`;
  if (model.runners.includes("vLLM")) return `vllm serve ${model.externalId}`;
  if (model.runners.includes("ComfyUI")) return `Load ${model.externalId} in ComfyUI (${model.quantizations[0] ?? "checkpoint"})`;
  return `from transformers import AutoModel; AutoModel.from_pretrained("${model.externalId}")`;
}
