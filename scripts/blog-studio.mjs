#!/usr/bin/env node

import { once } from 'node:events';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createBlogStudioServer, DEFAULT_PORT } from './lib/blog-studio-server.mjs';
import { findAvailablePort, resolveAstroPreview, startAstroDev } from './lib/blog-studio-runtime.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  let startedPreview = null;

  try {
    const existingPreview = await resolveAstroPreview(repositoryRoot);
    startedPreview = existingPreview ? null : await startAstroDev(repositoryRoot);
    const previewOrigin = existingPreview ?? startedPreview.origin;
    const requestedPort = Number(process.env.STUDIO_PORT) || DEFAULT_PORT;
    const studioPort = await findAvailablePort(requestedPort);
    const studio = createBlogStudioServer({
      port: studioPort,
      previewOrigin,
      repoRoot: repositoryRoot,
    });
    await once(studio, 'listening');

    let stopping = false;
    console.log('\nGalilieo Blog Studio');
    console.log(`  写作后台  http://127.0.0.1:${studio.address().port}`);
    console.log(`  真实预览  ${previewOrigin}${existingPreview ? '（复用现有服务）' : ''}`);
    console.log('  Ctrl+C 停止本次启动的本地服务\n');

    if (startedPreview) {
      startedPreview.process.on('error', (error) => {
        console.error(`Astro 启动失败：${error.message}`);
      });
      startedPreview.process.on('close', (code) => {
        if (!stopping) console.error(`Astro 开发预览已退出（${code ?? 'unknown'}）。`);
      });
    }

    function stop(exitCode = 0) {
      if (stopping) return;
      stopping = true;
      startedPreview?.process.kill('SIGTERM');
      studio.close(() => process.exit(exitCode));
      setTimeout(() => process.exit(1), 5000).unref();
    }

    process.on('SIGINT', () => stop(0));
    process.on('SIGTERM', () => stop(0));
  } catch (error) {
    startedPreview?.process.kill('SIGTERM');
    throw error;
  }
}

main().catch((error) => {
  console.error(`Galilieo Studio 启动失败：${error.message}`);
  process.exit(1);
});
