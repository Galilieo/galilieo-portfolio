import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FORBIDDEN_SEGMENTS = new Set(['admin', 'api', 'studio', 'tools']);

export function findStudioLeaks(distRoot) {
  const leaks = [];

  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const relativePath = relative(distRoot, path).split(sep).join('/');
      const segments = relativePath.toLowerCase().split('/');

      if (segments.some((segment) => FORBIDDEN_SEGMENTS.has(segment))) {
        leaks.push(relativePath);
        continue;
      }
      if (entry.isDirectory()) {
        visit(path);
      } else if (/\.(?:md|mdx)$/i.test(entry.name)) {
        leaks.push(relativePath);
      } else if (entry.name.endsWith('.html')) {
        const html = readFileSync(path, 'utf8');
        if (html.includes('studio_session=') || html.includes('data-blog-studio')) {
          leaks.push(relativePath);
        }
      }
    }
  }

  if (existsSync(distRoot)) visit(distRoot);
  return leaks;
}

export function checkStudioIsolation(distRoot = resolve(process.cwd(), 'dist')) {
  if (!existsSync(distRoot) || !statSync(distRoot).isDirectory()) {
    throw new Error('dist/ 不存在；请先运行生产构建');
  }
  const leaks = findStudioLeaks(distRoot);
  if (leaks.length > 0) throw new Error(`生产产物包含本地 Studio 内容：\n- ${leaks.join('\n- ')}`);
  return leaks;
}

const executedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executedDirectly) {
  try {
    checkStudioIsolation();
    console.log('Studio isolation check passed.');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
