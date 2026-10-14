/**
 * Approximate VRAM footprint. Weights + KV cache.
 * `params` is a parameter COUNT (from safetensors.parameters), not bytes.
 */
export const BYTES_PER_PARAM: Record<string, number> = {
  BF16: 2,
  F16: 2,
  F32: 4,
  FP8: 1,
  Q8_0: 1,
  INT8: 1,
  Q6_K: 0.75,
  Q5_K_M: 0.66,
  Q5_K_S: 0.625,
  Q4_K_M: 0.5625,
  Q4_K_S: 0.5,
  Q4_0: 0.5,
  Q4_1: 0.5125,
  Q3_K_M: 0.44,
  Q3_K_S: 0.375,
  Q2_K: 0.375,
  AWQ: 0.5,
  GPTQ: 0.5,
  INT4: 0.5,
  MLX_4BIT: 0.5,
  MLX_8BIT: 1,
  NVFP4: 0.5
};

/** Empirical anchor: a 7B model at 4096 tokens needs ~1 GB of KV cache. */
export const KV_GB_PER_BILLION_AT_4096 = 0.15;

export function bytesPerParam(quantization: string): number {
  const key = quantization.toUpperCase().replace("-", "_");
  return BYTES_PER_PARAM[key] ?? 2;
}

export function kvCacheGb(paramsCount: number, contextTokens = 4096): number {
  const billions = paramsCount / 1e9;
  return KV_GB_PER_BILLION_AT_4096 * billions * (contextTokens / 4096);
}

export function estimateVramGb(
  paramsCount: number,
  quantization = "BF16",
  contextTokens = 4096
): number | null {
  if (!paramsCount || paramsCount <= 0) return null;
  const weights = (paramsCount * bytesPerParam(quantization)) / 1e9;
  const kv = kvCacheGb(paramsCount, contextTokens);
  return Math.round((weights + kv) * 10) / 10;
}

export function formatParams(paramsCount: number | null): string {
  if (!paramsCount) return "unknown";
  const billions = paramsCount / 1e9;
  return `${billions < 1 ? billions.toFixed(2) : billions.toFixed(1)}B`;
}
