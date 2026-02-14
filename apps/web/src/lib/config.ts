const REQUIRED_STRIPE = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const;
const REQUIRED_SENDGRID = [
  'SENDGRID_API_KEY',
  'SENDGRID_FROM_EMAIL',
  'SENDGRID_VERIFICATION_TEMPLATE_ID',
  'SENDGRID_ORDER_TEMPLATE_ID',
  'SENDGRID_SELLER_TEMPLATE_ID',
] as const;

function getMissingEnv(keys: readonly string[]): string[] {
  return keys.filter((key) => !process.env[key]?.trim());
}

/**
 * Asserts that Stripe and SendGrid required env vars are set.
 * In development: throws a descriptive error if any are missing.
 * In production: logs a clear message if any are missing (does not throw).
 */
export function assertStripeAndSendGridConfig(): void {
  const missingStripe = getMissingEnv(REQUIRED_STRIPE);
  const missingSendGrid = getMissingEnv(REQUIRED_SENDGRID);
  const missing = [...missingStripe, ...missingSendGrid];

  if (missing.length === 0) return;

  const message = `Missing required env: ${missing.join(', ')}. Set these in .env.local.`;

  if (process.env.NODE_ENV === 'development') {
    throw new Error(message);
  }

  console.error(`[config] ${message}`);
}
