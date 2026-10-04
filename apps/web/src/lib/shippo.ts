import { Shippo } from 'shippo';
import { assertNotLiveKey } from '@/lib/sandbox';

function getApiKey(): string {
  const apiKey = process.env.SHIPPO_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'SHIPPO_API_KEY is required. Set it in .env.local (e.g. SHIPPO_API_KEY=shippo_test_...) and restart the dev server.'
    );
  }
  assertNotLiveKey('SHIPPO_API_KEY', apiKey);
  return apiKey;
}

let client: Shippo | null = null;

function getClient(): Shippo {
  if (!client) {
    client = new Shippo({ apiKeyHeader: getApiKey() });
  }
  return client;
}

/** Configured Shippo client. Throws if SHIPPO_API_KEY is missing (lazy on first use). */
export const shippo = new Proxy({} as Shippo, {
  get(_, prop) {
    return (getClient() as unknown as Record<string, unknown>)[prop as string];
  },
});
