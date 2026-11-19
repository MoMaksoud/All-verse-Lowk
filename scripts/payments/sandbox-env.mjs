import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const web = path.join(root, 'apps/web');
export const requireWeb = createRequire(path.join(web, 'package.json'));

export function sandboxEnvironment() {
  createRequire(requireWeb.resolve('next/package.json'))('@next/env').loadEnvConfig(web, true, { info() {}, error() {} });
  const override = path.join(web, '.env.sandbox.local');
  const env = { ...process.env, ...(existsSync(override) ? parseEnv(readFileSync(override, 'utf8')) : {}) };
  if (!['sk_test_', 'rk_test_', 'rkcs_test_'].some(prefix => env.STRIPE_SECRET_KEY?.startsWith(prefix))) {
    throw new Error('Set a test Stripe key in apps/web/.env.sandbox.local. Live keys are refused.');
  }
  Object.assign(env, {
    STRIPE_MODE: 'test', COMMERCE_SANDBOX: '1', NEXT_PUBLIC_COMMERCE_SANDBOX: '1',
    NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3005',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-allverse-sandbox',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-allverse-sandbox.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-allverse-sandbox.appspot.com',
    NEXT_PUBLIC_FIREBASE_API_KEY: 'sandbox-emulator-key',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:sandbox',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
    GCLOUD_PROJECT: 'demo-allverse-sandbox', GOOGLE_CLOUD_PROJECT: 'demo-allverse-sandbox',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9095',
    FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9195', FIREBASE_STORAGE_BUCKET: 'demo-allverse-sandbox.appspot.com',
    INTERNAL_OPS_TOKEN: 'local-sandbox-only',
  });
  for (const name of ['FIREBASE_SERVICE_ACCOUNT_KEY', 'GOOGLE_APPLICATION_CREDENTIALS', 'SHIPPO_API_KEY',
    'SENDGRID_API_KEY', 'GEMINI_API_KEY', 'NEXT_PUBLIC_GEMINI_API_KEY', 'SERPAPI_API_KEY']) env[name] = '';
  return env;
}
