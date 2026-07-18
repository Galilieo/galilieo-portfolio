import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, test } from 'node:test';

const runnerModule = await import('../scripts/lib/generated-site-contract.mjs').catch(
  () => undefined,
);
const temporaryDirectories = [];

function createRepository({ withDist = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'galilieo-site-contract-'));
  temporaryDirectories.push(root);
  if (withDist) mkdirSync(join(root, 'dist'));
  return root;
}

function createRecorder() {
  const errors = [];
  const logs = [];
  const exitCodes = [];
  return {
    errors,
    logs,
    exitCodes,
    logger: {
      error: (message) => errors.push(message),
      log: (message) => logs.push(message),
    },
    setExitCode: (code) => exitCodes.push(code),
  };
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

describe('generated Site Contract runner', () => {
  test('provides the narrow runner Module', () => {
    assert.equal(typeof runnerModule?.runGeneratedSiteContract, 'function');
  });

  test('fails clearly when dist is missing', async () => {
    assert.ok(runnerModule, 'generated Site Contract runner is missing');
    const recorder = createRecorder();
    const passed = await runnerModule.runGeneratedSiteContract(
      {
        name: 'Fixture',
        successMessage: 'fixture passed',
        check: () => [],
      },
      { repositoryRoot: createRepository({ withDist: false }), ...recorder },
    );

    assert.equal(passed, false);
    assert.deepEqual(recorder.exitCodes, [1]);
    assert.equal(recorder.errors.length, 1);
    assert.match(recorder.errors[0], /^FAIL: Fixture could not run: dist directory is missing/);
  });

  test('reports every checker failure in stable order', async () => {
    assert.ok(runnerModule, 'generated Site Contract runner is missing');
    const recorder = createRecorder();
    const root = createRepository();
    writeFileSync(join(root, 'dist', 'index.html'), '<main>fixture</main>', 'utf8');
    const passed = await runnerModule.runGeneratedSiteContract(
      {
        name: 'Fixture',
        successMessage: 'fixture passed',
        check: ({ readDist }) => {
          assert.match(readDist('index.html'), /fixture/);
          return ['first problem', 'second problem'];
        },
      },
      { repositoryRoot: root, ...recorder },
    );

    assert.equal(passed, false);
    assert.deepEqual(recorder.errors, ['FAIL: first problem', 'FAIL: second problem']);
    assert.deepEqual(recorder.exitCodes, [1]);
    assert.deepEqual(recorder.logs, []);
  });

  test('converts thrown checker errors into a named failure', async () => {
    assert.ok(runnerModule, 'generated Site Contract runner is missing');
    const recorder = createRecorder();
    const passed = await runnerModule.runGeneratedSiteContract(
      {
        name: 'Fixture',
        successMessage: 'fixture passed',
        check: () => {
          throw new Error('broken fixture');
        },
      },
      { repositoryRoot: createRepository(), ...recorder },
    );

    assert.equal(passed, false);
    assert.deepEqual(recorder.errors, ['FAIL: Fixture could not run: broken fixture']);
    assert.deepEqual(recorder.exitCodes, [1]);
  });

  test('prints the success message without setting an exit code', async () => {
    assert.ok(runnerModule, 'generated Site Contract runner is missing');
    const recorder = createRecorder();
    const passed = await runnerModule.runGeneratedSiteContract(
      {
        name: 'Fixture',
        successMessage: 'fixture passed',
        check: () => [],
      },
      { repositoryRoot: createRepository(), ...recorder },
    );

    assert.equal(passed, true);
    assert.deepEqual(recorder.logs, ['fixture passed']);
    assert.deepEqual(recorder.errors, []);
    assert.deepEqual(recorder.exitCodes, []);
  });
});
