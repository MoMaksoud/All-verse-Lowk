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
 * Throws a descriptive error if any are missing.
 */
export function assertStripeAndSendGridConfig(): void {
  const missingStripe = getMissingEnv(REQUIRED_STRIPE);
  const missingSendGrid = getMissingEnv(REQUIRED_SENDGRID);
  const missing = [...missingStripe, ...missingSendGrid];

  if (missing.length === 0) return;

  const message = `Missing required env: ${missing.join(', ')}. Set these in .env.local.`;

  throw new Error(message);
}
