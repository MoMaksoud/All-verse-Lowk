import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({ mode: false, payment: vi.fn(), create: vi.fn(), settle: vi.fn(), eventWrite: vi.fn(), eventRef: {} as any }));
vi.mock('@/lib/config', () => ({ assertStripeWebhookConfig: vi.fn(), getMissingSendGridVars: () => [] }));
vi.mock('@/lib/payments/environment', () => ({ getStripeMode: () => 'test', assertStripeObjectMode: (live: boolean) => { if (live) throw new Error('Wrong mode'); } }));
vi.mock('@/lib/stripe', () => ({ verifyWebhookSignature: () => ({ success: true, event: { id: 'evt_test', livemode: state.mode, type: 'checkout.session.completed', data: { object: { id: 'cs_test' } } } }),
  stripe: { checkout: { sessions: { retrieve: async () => ({ id: 'cs_test', livemode: false, payment_status: 'paid', amount_total: 1000, payment_intent: 'pi_test' }) } } } }));
vi.mock('@/lib/firebase-admin', () => ({ getAdminAuth: () => null, getAdminFirestore: () => ({ collection: () => ({ doc: () => state.eventRef }),
  runTransaction: async callback => callback({ get: async () => ({ exists: false, data: () => undefined }), set: vi.fn() }) }) }));
vi.mock('@/lib/server/adminCheckoutSnapshots', () => ({ getCheckoutSnapshotAdmin: async () => ({ id: 'cs_test', sessionId: 'cs_test', stripeMode: 'test', status: 'processed', orderId: 'order', buyerId: 'buyer', total: 10, currency: 'USD' }), markSnapshotExpiredAdmin: vi.fn() }));
vi.mock('@/lib/server/adminOrders', () => ({ createOrderFromSnapshotAdmin: state.create, getOrderAdmin: async () => ({ id: 'order', buyerId: 'buyer', total: 10, currency: 'USD', items: [], status: 'paid' }), updateOrderAdmin: vi.fn() }));
vi.mock('@/lib/server/adminPayments', () => ({ getPaymentsByOrderAdmin: async () => [], createPaymentAdmin: state.payment, updatePaymentAdmin: vi.fn() }));
vi.mock('@/lib/payments/sellerPayouts', () => ({ settleSellerPayouts: state.settle }));
vi.mock('@/lib/server/adminProfiles', () => ({ getProfileDocumentAdmin: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendOrderConfirmationEmail: vi.fn(), sendSellerNotificationEmail: vi.fn(), sendBuyerTrackingEmail: vi.fn() }));
vi.mock('@/lib/emailLog', () => ({ logEmail: vi.fn() }));
vi.mock('@/lib/server/push-notifications', () => ({ sendPushNotification: vi.fn() }));
vi.mock('@/lib/payments/shippingLabel', () => ({ acquireShippingLabelLock: vi.fn(), createAndResolveShippoLabel: vi.fn(), markShippingLabelSuccess: vi.fn(), markShippingLabelFailed: vi.fn() }));
import { POST } from './stripeCheckoutWebhook';

beforeEach(() => {
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_local_test');
  vi.clearAllMocks(); state.mode = false; state.eventRef = { set: state.eventWrite };
  state.payment.mockResolvedValue('payment'); state.settle.mockResolvedValue({ payoutStatus: 'pending_connect' });
});
afterEach(() => vi.unstubAllEnvs());
describe('webhook recovery boundaries', () => {
  it('resumes missing payment/transfer work after a processed snapshot instead of acknowledging early', async () => {
    const response = await POST(new NextRequest('http://localhost/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': 'test' }, body: '{}' }));
    expect(response.status).toBe(200); expect(state.create).not.toHaveBeenCalled();
    expect(state.payment).toHaveBeenCalledOnce(); expect(state.settle).toHaveBeenCalledOnce();
  });
  it('rejects signed opposite-mode events before any settlement write', async () => {
    state.mode = true;
    const response = await POST(new NextRequest('http://localhost/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': 'test' }, body: '{}' }));
    expect(response.status).toBe(400); expect(state.payment).not.toHaveBeenCalled(); expect(state.eventWrite).not.toHaveBeenCalled();
  });
});
