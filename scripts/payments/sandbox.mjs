import { spawn } from 'node:child_process';
import { root, web, requireWeb, sandboxEnvironment } from './sandbox-env.mjs';

const env = sandboxEnvironment();
const next = requireWeb.resolve('next/dist/bin/next');
console.log('AllVerse payment sandbox: http://127.0.0.1:3005 (test Stripe, demo Firebase, simulated shipping).');
console.log('Start emulators with pnpm payments:emulators, then run pnpm payments:seed.');
const child = spawn(process.execPath, [next, 'dev', '-H', '127.0.0.1', '-p', '3005'], { cwd: web, env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 1));
