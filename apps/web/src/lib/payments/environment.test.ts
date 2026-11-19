import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertPaymentPersistence, assertStripeObjectMode, getSandboxShipping, getStripeMode, isCommerceSandbox } from './environment';

afterEach(() => vi.unstubAllEnvs());
describe('payment environment isolation', () => {
  it.each(['sk_test_example', 'rk_test_example', 'rkcs_test_example'])('recognizes test key %s', key => {
    expect(getStripeMode({ STRIPE_SECRET_KEY: key })).toBe('test');
  });
  it('requires valid keys without exposing their values', () => {
    expect(() => getStripeMode({ STRIPE_SECRET_KEY: 'sensitive-invalid-value' })).toThrow('Configure a valid');
  });
  it('rejects live keys in explicit test mode', () => {
    expect(() => getStripeMode({ STRIPE_MODE: 'test', STRIPE_SECRET_KEY: 'sk_live_example' })).toThrow('does not match');
  });
  it('rejects mismatched client and server keys', () => {
    expect(() => getStripeMode({ STRIPE_SECRET_KEY: 'sk_test_example', NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_example' })).toThrow('same mode');
  });
  it('refuses test payments against an implicit shared database', () => {
    expect(() => assertPaymentPersistence({ STRIPE_SECRET_KEY: 'sk_test_example', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'production-app' })).toThrow('requires Firebase emulators');
  });
  it('requires auth and Firestore emulators together', () => {
    expect(() => assertPaymentPersistence({ STRIPE_SECRET_KEY: 'sk_test_example', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085' })).toThrow();
    expect(() => assertPaymentPersistence({ STRIPE_SECRET_KEY: 'sk_test_example', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9095' })).not.toThrow();
  });
  it('allows a deliberately selected dedicated test project', () => {
    expect(() => assertPaymentPersistence({ STRIPE_SECRET_KEY: 'sk_test_example', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'dedicated-staging', STRIPE_TEST_FIREBASE_PROJECT_ID: 'dedicated-staging' })).not.toThrow();
  });
  it('rejects opposite-mode signed objects', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_example');
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', '');
    expect(() => assertStripeObjectMode(true)).toThrow('different payment mode');
    expect(() => assertStripeObjectMode(false)).not.toThrow();
  });
  it('only simulates shipping in the isolated demo environment', () => {
    vi.stubEnv('COMMERCE_SANDBOX', '1'); vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_example');
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', ''); vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'production-app');
    expect(() => isCommerceSandbox()).toThrow('demo-allverse-sandbox');
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'demo-allverse-sandbox');
    vi.stubEnv('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8085'); vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9095');
    expect(getSandboxShipping()).toMatchObject({ price: 5, carrier: 'Sandbox' });
  });
});
