const REQUIRED_STRIPE_CHECKOUT = ['STRIPE_SECRET_KEY'] as const;
const REQUIRED_STRIPE_WEBHOOK = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const;
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

/** Asserts only Stripe checkout vars — use before creating a checkout session. */
export function assertStripeConfig(): void {
  const missing = getMissingEnv(REQUIRED_STRIPE_CHECKOUT);
  if (missing.length === 0) return;
  throw new Error(`Missing required Stripe env: ${missing.join(', ')}. Set these in .env.local.`);
}

/** Asserts only Stripe webhook signature vars — use at the top of the webhook handler. */
export function assertStripeWebhookConfig(): void {
  const missing = getMissingEnv(REQUIRED_STRIPE_WEBHOOK);
  if (missing.length === 0) return;
  throw new Error(`Missing required Stripe webhook env: ${missing.join(', ')}. Set these in .env.local.`);
}

/** Returns missing SendGrid vars without throwing — caller decides how to handle. */
export function getMissingSendGridVars(): string[] {
  return getMissingEnv(REQUIRED_SENDGRID);
}

/**
 * Asserts Stripe webhook + SendGrid vars.
 * @deprecated Use assertStripeWebhookConfig() + getMissingSendGridVars() separately so
 * payment processing is not blocked when only email config is missing.
 */
export function assertStripeAndSendGridConfig(): void {
  const missing = [...getMissingEnv(REQUIRED_STRIPE_WEBHOOK), ...getMissingEnv(REQUIRED_SENDGRID)];
  if (missing.length === 0) return;
  throw new Error(`Missing required env: ${missing.join(', ')}. Set these in .env.local.`);
}
