export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Legacy compatibility alias.
// Canonical endpoint: /api/stripe/webhook
export { POST } from '@/app/api/stripe/webhook/route';
