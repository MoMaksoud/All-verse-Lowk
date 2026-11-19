import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { root, web, sandboxEnvironment } from './sandbox-env.mjs';

const env = sandboxEnvironment();
const override = path.join(web, '.env.sandbox.local');
const events = 'checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.expired,checkout.session.async_payment_failed';
const child = spawn('npm', ['exec', '--yes', '--package=@stripe/cli', '--', 'stripe', 'listen',
  '--events', events, '--forward-to', 'http://127.0.0.1:3005/api/stripe/webhook'], {
  cwd: root, env: { ...env, STRIPE_API_KEY: env.STRIPE_SECRET_KEY }, stdio: ['ignore', 'pipe', 'pipe'],
});
let buffer = '', ready = false;
function output(chunk) {
  buffer = (buffer + chunk.toString()).slice(-12000);
  const secret = buffer.match(/whsec_[A-Za-z0-9]+/)?.[0];
  if (secret && !ready) {
    const previous = existsSync(override) ? readFileSync(override, 'utf8') : '';
    const setting = `STRIPE_WEBHOOK_SECRET=${secret}`;
    const next = /^STRIPE_WEBHOOK_SECRET=.*$/m.test(previous)
      ? previous.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m, setting)
      : `${previous.trimEnd()}\n${setting}\n`;
    writeFileSync(override, next, { mode: 0o600 });
    chmodSync(override, 0o600);
    ready = true;
    console.log('Stripe forwarding ready. Signing secret saved to .env.sandbox.local; start or restart pnpm dev:sandbox.');
  }
  // CLI output can split credentials across chunks; print only known event summaries.
  for (const line of chunk.toString().split('\n')) {
    if (/--> checkout\.session\./.test(line)) console.log('Checkout event received by Stripe CLI.');
    if (/<--\s+\[\d{3}\]/.test(line)) console.log(`Local webhook response: ${line.match(/\[(\d{3})\]/)?.[1]}`);
  }
}
child.stdout.on('data', output);
child.stderr.on('data', output);
child.on('error', () => { console.error('Unable to start Stripe CLI. Check npm/network access.'); process.exitCode = 1; });
child.on('exit', code => {
  if (!ready) console.error('Stripe forwarding did not become ready. Check sandbox key permissions and Stripe CLI access.');
  process.exit(code ?? 1);
});
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
