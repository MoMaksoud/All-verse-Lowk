// Sandbox = anything that isn't the live site: local dev, emulators, Vercel preview deploys.
// In a sandbox, third-party clients refuse live keys and emails are logged instead of sent.
export const isSandbox =
  process.env.NEXT_PUBLIC_USE_EMULATOR === 'true' ||
  process.env.VERCEL_ENV === 'preview' ||
  process.env.NODE_ENV === 'development';

/** Stripe (sk_live_/rk_live_) and Shippo (shippo_live_) live keys all contain "_live_". */
export function assertNotLiveKey(name: string, value: string | undefined) {
  if (isSandbox && value?.includes('_live_')) {
    throw new Error(`[sandbox] ${name} is a LIVE key. Use a test key outside production.`);
  }
}
