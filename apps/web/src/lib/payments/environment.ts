export type StripeMode = 'test' | 'live';

/** API keys select Stripe's environment. Never log or return their values. */
export function getStripeMode(env: Readonly<Record<string, string | undefined>> = process.env): StripeMode {
  const key = env.STRIPE_SECRET_KEY?.trim();
  const actual = key?.startsWith('sk_test_') || key?.startsWith('rk_test_') || key?.startsWith('rkcs_test_') ? 'test'
    : key?.startsWith('sk_live_') || key?.startsWith('rk_live_') ? 'live' : null;
  if (!actual) throw new Error('Configure a valid Stripe secret or restricted API key.');
  const expected = env.STRIPE_MODE?.trim() || actual;
  if (expected !== 'test' && expected !== 'live') throw new Error('STRIPE_MODE must be test or live.');
  if (expected !== actual) throw new Error('Stripe API key does not match STRIPE_MODE.');
  const publicKey = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (publicKey && !publicKey.startsWith(`pk_${actual}_`)) throw new Error('Stripe publishable and server keys must use the same mode.');
  return actual;
}

/** Test money must not mutate the production marketplace's stock or profiles. */
export function assertPaymentPersistence(env: Readonly<Record<string, string | undefined>> = process.env): void {
  if (getStripeMode(env) !== 'test') return;
  const project = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const emulated = !!env.FIRESTORE_EMULATOR_HOST && !!env.FIREBASE_AUTH_EMULATOR_HOST;
  const explicitTestProject = !!env.STRIPE_TEST_FIREBASE_PROJECT_ID &&
    env.STRIPE_TEST_FIREBASE_PROJECT_ID === project && !project?.startsWith('demo-');
  if (!emulated && !explicitTestProject) throw new Error('Stripe testing requires Firebase emulators or an explicitly configured dedicated STRIPE_TEST_FIREBASE_PROJECT_ID.');
}

export function assertStripeObjectMode(livemode: boolean): void {
  if (livemode !== (getStripeMode() === 'live')) throw new Error('Stripe object belongs to a different payment mode.');
}

export function isCommerceSandbox(): boolean {
  if (process.env.COMMERCE_SANDBOX !== '1') return false;
  if (getStripeMode() !== 'test' || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'demo-allverse-sandbox' ||
      !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('Commerce sandbox requires test Stripe keys and the demo-allverse-sandbox Firebase emulators.');
  }
  return true;
}

export function getSandboxShipping() {
  if (!isCommerceSandbox()) return null;
  return { carrier: 'Sandbox', serviceName: 'Simulated shipping', price: 5,
    rateId: 'sandbox_rate', shipmentId: 'sandbox_shipment' };
}
