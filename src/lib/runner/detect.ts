import type { RawModel } from "../model.ts";

export const RUNNERS = [
  "llama.cpp",
  "Ollama",
  "MLX",
  "vLLM",
  "ComfyUI",
  "transformers",
  "ExLlama",
  "koboldcpp",
  "llamafile",
  "Core ML",
  "OpenVINO",
  "ONNX"
] as const;

export type Runner = (typeof RUNNERS)[number];

const LIBRARY_RUNNERS: Record<string, Runner> = {
  gguf: "llama.cpp",
  mlx: "MLX",
  mlx_lm: "MLX",
  vllm: "vLLM",
  diffusers: "ComfyUI",
  transformers: "transformers",
  exllama: "ExLlama",
  exl2: "ExLlama",
  koboldcpp: "koboldcpp",
  llamafile: "llamafile",
  coreml: "Core ML",
  openvino: "OpenVINO",
  onnx: "ONNX"
};

const TAG_RUNNERS: Record<string, Runner> = {
  gguf: "llama.cpp",
  "comfyui-gguf": "ComfyUI",
  comfyui: "ComfyUI",
  mlx: "MLX",
  awq: "ExLlama",
  gptq: "ExLlama",
  exl2: "ExLlama",
  vllm: "vLLM",
  koboldcpp: "koboldcpp",
  llamafile: "llamafile",
  coreml: "Core ML",
  openvino: "OpenVINO",
  onnx: "ONNX",
  bnb: "transformers",
  quantized: "transformers"
};

const FILE_RUNNERS: Array<{ pattern: RegExp; runner: Runner }> = [
  { pattern: /\.gguf$/i, runner: "llama.cpp" },
  { pattern: /\.(safetensors)$/i, runner: "transformers" },
  { pattern: /model\.bin$/i, runner: "transformers" }
];

export function detectRunners(model: RawModel): Runner[] {
  const found = new Set<Runner>();
  const library = (model.libraryName ?? "").toLowerCase();
  if (library && LIBRARY_RUNNERS[library]) found.add(LIBRARY_RUNNERS[library]);

  for (const tag of model.tags) {
    const t = tag.toLowerCase();
    if (TAG_RUNNERS[t]) found.add(TAG_RUNNERS[t]);
  }

  for (const file of model.siblings ?? []) {
    for (const { pattern, runner } of FILE_RUNNERS) {
      if (pattern.test(file)) found.add(runner);
    }
  }

  return [...found].sort((a, b) => a.localeCompare(b));
}

export function detectQuantizations(model: RawModel): string[] {
  const quant = new Set<string>();

  for (const tag of model.tags) {
    const t = tag.toLowerCase();
    if (/^q\d(_k_[sml]|_0|_1)?$/.test(t) || /^q\d_k$/.test(t)) quant.add(t.toUpperCase());
    if (["awq", "gptq", "fp8", "int8", "int4", "bnb", "nvfp4", "mlx-4bit", "mlx-8bit"].includes(t)) quant.add(t.toUpperCase());
  }

  for (const file of model.siblings ?? []) {
    const match = file.toUpperCase().match(/(Q\d(?:_K_[SML]|_K|_0|_1)?|FP8|INT8|INT4|NVFP4|MLX-\dBIT|BF16)/);
    if (match) quant.add(match[1]);
  }

  for (const dtype of Object.keys(model.safetensors?.parameters ?? {})) {
    quant.add(dtype.toUpperCase());
  }

  return [...quant].sort();
}
