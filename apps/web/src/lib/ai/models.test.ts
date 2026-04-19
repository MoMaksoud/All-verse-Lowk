import { describe, expect, it } from 'vitest';
import { GEMINI_MODELS, resolveGeminiModel } from './models';

describe('resolveGeminiModel', () => {
  it('defaults to FAST', () => {
    expect(resolveGeminiModel()).toBe(GEMINI_MODELS.FAST);
    expect(resolveGeminiModel(undefined)).toBe(GEMINI_MODELS.FAST);
  });

  it('resolves config keys', () => {
    expect(resolveGeminiModel('FAST')).toBe(GEMINI_MODELS.FAST);
    expect(resolveGeminiModel('SMART')).toBe(GEMINI_MODELS.SMART);
  });

  it('passes through raw model ids', () => {
    expect(resolveGeminiModel('custom-model-id')).toBe('custom-model-id');
  });
});
