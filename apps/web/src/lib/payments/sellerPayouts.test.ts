import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ profile: vi.fn(), account: vi.fn(), intent: vi.fn(), transfer: vi.fn(), get: vi.fn(), update: vi.fn(), record: vi.fn() }));
vi.mock('@/lib/stripe', () => ({ calculateSellerPayout: (value: number) => ({ sellerPayout: value * 0.955 }),
  getConnectAccount: mocks.account, stripe: { paymentIntents: { retrieve: mocks.intent } }, transferToSeller: mocks.transfer }));
vi.mock('@/lib/server/adminProfiles', () => ({ getProfileDocumentAdmin: mocks.profile }));
vi.mock('@/lib/server/adminOrders', () => ({ getOrderAdmin: mocks.get, updateOrderAdmin: mocks.update, recordPayoutTransferAdmin: mocks.record }));
import { settleSellerPayouts, payoutLineKey } from './sellerPayouts';

let order: any;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('STRIPE_MODE', 'test'); vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_example');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', '');
  vi.stubEnv('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8085'); vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9095');
  order = { id: 'order', status: 'paid', stripeMode: 'test', paymentIntentId: 'pi_original', payoutTransferIds: [],
    items: [{ listingId: 'listing-a', sellerId: 'a', unitPrice: 100, qty: 1 }, { listingId: 'listing-b', sellerId: 'b', unitPrice: 20, qty: 1 }] };
  mocks.profile.mockImplementation(async id => ({ stripeConnectAccountId: `acct_${id}`, stripeConnectOnboardingComplete: false }));
  mocks.account.mockImplementation(async id => ({ success: true, payoutsEnabled: true, account: { metadata: { userId: id.slice(5) }, capabilities: { transfers: 'active' } } }));
  mocks.intent.mockResolvedValue({ status: 'succeeded', livemode: false, latest_charge: 'ch_original' });
  mocks.transfer.mockImplementation(async id => ({ success: true, transferId: `tr_${id}` }));
  mocks.get.mockImplementation(async () => order);
  mocks.update.mockImplementation(async (_id, patch) => Object.assign(order, patch));
  mocks.record.mockImplementation(async (_id, record) => { if (!order.payoutTransferIds.some(t => t.lineKey === record.lineKey)) order.payoutTransferIds.push(record); });
});
afterEach(() => vi.unstubAllEnvs());

describe('seller settlement recovery', () => {
  it('does not mark missing Connect onboarding complete', async () => {
    mocks.profile.mockResolvedValue(null);
    expect(await settleSellerPayouts(order)).toMatchObject({ payoutStatus: 'pending_connect', retriesApplied: 0, pendingConnectCount: 2 });
    expect(order.payoutsProcessed).toBe(false); expect(order.payoutRetryable).toBe(true); expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('keeps mixed ready and missing sellers pending and preserves successful receipts', async () => {
    mocks.profile.mockImplementation(async id => id === 'a' ? { stripeConnectAccountId: 'acct_a' } : null);
    expect((await settleSellerPayouts(order)).payoutStatus).toBe('pending_connect');
    expect(order.payoutTransferIds).toHaveLength(1); expect(order.payoutsProcessed).toBe(false);
  });
  it('uses live provider readiness instead of a stale onboarding flag and funds from the charge', async () => {
    expect((await settleSellerPayouts(order)).payoutStatus).toBe('complete');
    expect(mocks.transfer).toHaveBeenCalledWith('acct_a', 95.5, 'order', 'payout_order_0_listinga_a', 'ch_original');
    expect(order.payoutTransferIds).toHaveLength(2); expect(order.paymentSourceChargeId).toBe('ch_original');
  });
  it('does not transfer again when a receipt exists', async () => {
    order.payoutTransferIds = order.items.map((item, index) => ({ lineKey: payoutLineKey(order.id, index, item.listingId, item.sellerId) }));
    expect((await settleSellerPayouts(order)).payoutStatus).toBe('complete'); expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('records transfer failure as retryable instead of complete', async () => {
    mocks.transfer.mockResolvedValue({ success: false, error: 'Insufficient funds' });
    expect((await settleSellerPayouts(order)).payoutStatus).toBe('partial_failed'); expect(order.payoutRetryable).toBe(true);
  });
  it('does not transfer to another seller account', async () => {
    mocks.account.mockResolvedValue({ success: true, payoutsEnabled: true, account: { metadata: { userId: 'someone-else' }, capabilities: { transfers: 'active' } } });
    expect((await settleSellerPayouts(order)).payoutStatus).toBe('partial_failed'); expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('keeps a restricted account pending even with a saved complete flag', async () => {
    mocks.account.mockResolvedValue({ success: true, payoutsEnabled: false, account: { metadata: { userId: 'a' }, capabilities: { transfers: 'pending' } } });
    await settleSellerPayouts(order); expect(order.payoutsProcessed).toBe(false); expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('rejects unpaid orders', async () => {
    order.status = 'pending'; await expect(settleSellerPayouts(order)).rejects.toThrow('paid order'); expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('does not fund from a payment that has not succeeded', async () => {
    mocks.intent.mockResolvedValue({ status: 'processing', livemode: false });
    expect((await settleSellerPayouts(order)).payoutStatus).toBe('partial_failed'); expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('rejects wrong-mode orders', async () => {
    order.stripeMode = 'live'; await expect(settleSellerPayouts(order)).rejects.toThrow('different Stripe mode');
  });
});
