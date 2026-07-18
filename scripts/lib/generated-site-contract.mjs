import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';

function resolveInside(root, segments) {
  const path = resolve(root, ...segments);
  if (path !== root && !path.startsWith(`${root}${sep}`)) {
    throw new Error(`path escapes generated Site Contract root: ${path}`);
  }
  return path;
}

function createContext(repositoryRoot) {
  const root = resolve(repositoryRoot);
  const distRoot = resolve(root, 'dist');
  if (!existsSync(distRoot) || !statSync(distRoot).isDirectory()) {
    throw new Error(`dist directory is missing at ${distRoot}`);
  }

  return {
    repositoryRoot: root,
    distRoot,
    resolveRepository: (...segments) => resolveInside(root, segments),
    resolveDist: (...segments) => resolveInside(distRoot, segments),
    readRepository: (...segments) => readFileSync(resolveInside(root, segments), 'utf8'),
    readDist: (...segments) => readFileSync(resolveInside(distRoot, segments), 'utf8'),
  };
}

export async function runGeneratedSiteContract(
  { name, successMessage, check },
  {
    repositoryRoot = process.cwd(),
    logger = console,
    setExitCode = (code) => {
      process.exitCode = code;
    },
  } = {},
) {
  let failures;
  try {
    failures = await check(createContext(repositoryRoot));
    if (!Array.isArray(failures)) {
      throw new TypeError('checker must return an array of failure messages');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures = [`${name} could not run: ${message}`];
  }

  if (failures.length > 0) {
    for (const failure of failures) logger.error(`FAIL: ${failure}`);
    setExitCode(1);
    return false;
  }

  logger.log(successMessage);
  return true;
}
