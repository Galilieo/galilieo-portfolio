import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  { name: 'Prettier', script: 'format:check' },
  { name: 'ESLint', script: 'lint' },
  { name: 'Astro check', script: 'check' },
  { name: 'Astro build', script: 'build' },
  { name: 'Site identity and shell contracts', script: 'check:site' },
  { name: 'Blog navigation structure', script: 'check:blog' },
  { name: 'Homepage structure', script: 'check:home' },
  { name: 'Node tests', script: 'test' },
  { name: 'Studio isolation check', script: 'check:studio' },
];

function pnpmInvocation(script) {
  if (process.platform === 'win32') {
    return {
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', `pnpm run ${script}`],
    };
  }

  const npmExecPath = process.env.npm_execpath;

  if (npmExecPath && existsSync(npmExecPath)) {
    return {
      command: process.execPath,
      args: [npmExecPath, 'run', script],
    };
  }

  return {
    command: 'pnpm',
    args: ['run', script],
  };
}

console.log('Galilieo Portfolio verification');
console.log(`Repository: ${repositoryRoot}`);

for (const [index, check] of checks.entries()) {
  const step = `${index + 1}/${checks.length}`;
  console.log(`\n=== ${step} ${check.name}: pnpm run ${check.script} ===`);

  const invocation = pnpmInvocation(check.script);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: repositoryRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`\nVerification could not start ${check.name}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\nVerification failed at ${check.name} (exit ${result.status ?? 1}).`);
    process.exit(result.status ?? 1);
  }
}

console.log(
  '\nVerification passed: formatting, lint, Astro check, build, blog/home contracts, Node tests, and production isolation completed successfully.',
);
