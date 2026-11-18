import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ transfer: vi.fn(), checkout: vi.fn(), endpoints: [] as any[] }));
vi.mock('stripe', () => ({ default: class {
  transfers = { create: mocks.transfer };
  checkout = { sessions: { create: mocks.checkout } };
  webhookEndpoints = { list: () => (async function* () { yield* mocks.endpoints; })() };
} }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); mocks.endpoints = [];
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_example'); vi.stubEnv('STRIPE_MODE', 'test');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', ''); vi.stubEnv('COMMERCE_SANDBOX', '');
  vi.stubEnv('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8085'); vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9095');
  mocks.transfer.mockResolvedValue({ id: 'tr_result' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe('Stripe transfer contract', () => {
  it('associates the exact source charge and keeps retry identity stable', async () => {
    const { transferToSeller } = await import('@/lib/stripe');
    const result = await transferToSeller('acct_seller', 95.5, 'order', 'stable-key', 'ch_source');
    expect(result.success).toBe(true);
    expect(mocks.transfer).toHaveBeenCalledWith(expect.objectContaining({ amount: 9550, currency: 'usd', destination: 'acct_seller', source_transaction: 'ch_source', transfer_group: 'order_order' }), { idempotencyKey: 'stable-key' });
  });
  it('refuses an unfunded standalone transfer', async () => {
    const { transferToSeller } = await import('@/lib/stripe');
    expect((await transferToSeller('acct_seller', 10, 'order', 'key', '')).success).toBe(false);
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('imports successfully without credentials but fails before an API mutation', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const { transferToSeller } = await import('@/lib/stripe');
    expect((await transferToSeller('acct_seller', 10, 'order', 'key', 'ch_source')).success).toBe(false);
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('blocks sandbox mutations if the account still forwards events to a public backend', async () => {
    vi.stubEnv('COMMERCE_SANDBOX', '1'); vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'demo-allverse-sandbox');
    mocks.endpoints = [{ status: 'enabled', url: 'https://production.example/api/webhooks/stripe' }];
    const { transferToSeller } = await import('@/lib/stripe');
    const result = await transferToSeller('acct_seller', 10, 'order', 'key', 'ch_source');
    expect(result.success).toBe(false); expect(result.error).toContain('public webhook'); expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('allows local-only webhook forwarding in the sandbox', async () => {
    vi.stubEnv('COMMERCE_SANDBOX', '1'); vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'demo-allverse-sandbox');
    mocks.endpoints = [{ status: 'enabled', url: 'http://127.0.0.1:3005/api/stripe/webhook' }];
    const { transferToSeller } = await import('@/lib/stripe');
    expect((await transferToSeller('acct_seller', 10, 'order', 'key', 'ch_source')).success).toBe(true);
  });
});
