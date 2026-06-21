/**
 * Central Gemini model configuration.
 * FAST: high-volume / low-latency tasks (chat, search, vision).
 * SMART: deep reasoning / high-value generation (market analysis, final listing).
 */
export const GEMINI_MODELS = {
  FAST: "gemini-2.5-flash",
  SMART: "gemini-2.5-pro",
} as const;

export type GeminiModelKey = keyof typeof GEMINI_MODELS;

/** Config key (FAST | SMART) or a raw model id string for overrides. */
export type GeminiModelOption = GeminiModelKey | string;

export function resolveGeminiModel(modelOption?: GeminiModelOption): string {
  if (modelOption == null) return GEMINI_MODELS.FAST;
  if (modelOption in GEMINI_MODELS) {
    return GEMINI_MODELS[modelOption as GeminiModelKey];
  }
  return modelOption;
}
