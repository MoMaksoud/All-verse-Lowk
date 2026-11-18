import { spawn } from 'node:child_process';
import { root, sandboxEnvironment } from './sandbox-env.mjs';
const child = spawn('pnpm', ['--filter', '@marketplace/web', 'exec', 'vitest', 'run', 'src/lib/server/commerce.emulator.test.ts'], {
  cwd: root, env: sandboxEnvironment(), stdio: 'inherit',
});
child.on('exit', code => process.exit(code ?? 1));
