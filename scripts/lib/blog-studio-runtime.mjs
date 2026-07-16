import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';

export async function findAvailablePort(startPort, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1, host));
        return;
      }
      reject(err);
    });
    server.listen(startPort, host, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

export async function resolveAstroPreview(repoRoot) {
  const devJson = join(repoRoot, '.astro', 'dev.json');
  if (!existsSync(devJson)) return null;

  let config;
  try {
    config = JSON.parse(readFileSync(devJson, 'utf8'));
  } catch {
    return null;
  }

  const url = config.url;
  if (!url) return null;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:') return null;

  const hostname = parsed.hostname;
  if (hostname !== '127.0.0.1' && hostname !== 'localhost') return null;

  // Check if the server is actually reachable
  const origin = parsed.origin;
  try {
    const response = await fetch(`${origin}/`, { signal: AbortSignal.timeout(2000) });
    if (response.ok || response.status < 500) return origin;
    return null;
  } catch {
    return null;
  }
}

export async function startAstroDev(repoRoot) {
  const port = await findAvailablePort(4321);
  const astroCli = join(repoRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');

  if (!existsSync(astroCli)) {
    throw new Error(`找不到 Astro CLI: ${astroCli}`);
  }

  const child = spawn(
    process.execPath,
    [astroCli, 'dev', '--host', '127.0.0.1', '--port', String(port)],
    { cwd: repoRoot, env: process.env, stdio: ['ignore', 'inherit', 'inherit'] },
  );

  const origin = `http://127.0.0.1:${port}`;

  // Wait for the Astro dev server to be ready
  await new Promise((resolveWait, rejectWait) => {
    const start = Date.now();
    const maxWait = 60_000;
    const poll = async () => {
      if (child.exitCode !== null || child.killed) {
        return rejectWait(new Error('Astro dev process exited prematurely'));
      }
      try {
        const response = await fetch(origin, { signal: AbortSignal.timeout(1000) });
        if (response.ok || response.status < 500) return resolveWait();
      } catch {
        // Not ready yet
      }
      if (Date.now() - start > maxWait) {
        child.kill('SIGTERM');
        return rejectWait(new Error('Astro dev server did not start within 60s'));
      }
      setTimeout(poll, 500);
    };
    poll();
  });

  return { process: child, origin };
}
