import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  symlinkSync,
  linkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  required,
  assertSuccessful,
  assertQuality,
  assertPublication,
} from './quality-status.mjs';
import { seal, verify } from './build-proof.mjs';

const context = {
  GITHUB_REPOSITORY: 'sl3ndrr/m8e-calc',
  GITHUB_SHA: 'a'.repeat(40),
  GITHUB_REF: 'refs/heads/main',
  GITHUB_EVENT_NAME: 'push',
  GITHUB_RUN_ID: '123',
  GITHUB_RUN_ATTEMPT: '1',
};
const green = () =>
  Object.fromEntries(required.map((name) => [name, { result: 'success' }]));

test('every prerequisite must succeed; missing, failed, cancelled, skipped and unknown deny publication', () => {
  assert.doesNotThrow(() => assertSuccessful(green()));
  for (const name of required) {
    for (const result of [
      'failure',
      'cancelled',
      'skipped',
      'neutral',
      undefined,
    ]) {
      const needs = green();
      needs[name] = { result };
      assert.throws(() => assertSuccessful(needs));
    }
    const missing = green();
    delete missing[name];
    assert.throws(() => assertSuccessful(missing));
  }
  assert.throws(() => assertSuccessful({}));
  assert.throws(() =>
    assertSuccessful({ ...green(), surprise: { result: 'success' } }),
  );
});

test('currency evidence is required only on its declared branch; no unexpected skips', () => {
  for (const required of [true, false]) {
    const expected = required ? 'success' : 'skipped';
    const needs = { ...green(), 'currency-source': { result: expected } };
    assert.doesNotThrow(() => assertQuality(needs, required));
    for (const result of [
      'success',
      'failure',
      'cancelled',
      'skipped',
      undefined,
    ]) {
      if (result !== expected)
        assert.throws(() =>
          assertQuality(
            { ...green(), 'currency-source': { result } },
            required,
          ),
        );
    }
    assert.throws(() => assertQuality(green(), required));
  }
});

test('only successful current upstream main push can publish; no PR, fork or stale rerun', () => {
  assert.doesNotThrow(() =>
    assertPublication(context, context.GITHUB_SHA, 'success'),
  );
  for (const status of ['failure', 'cancelled', 'skipped', undefined])
    assert.throws(() => assertPublication(context, context.GITHUB_SHA, status));
  for (const override of [
    { GITHUB_REPOSITORY: 'fork/m8e-calc' },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_EVENT_NAME: 'workflow_run' },
    { GITHUB_REF: 'refs/heads/feature' },
    { GITHUB_SHA: 'invalid' },
  ])
    assert.throws(() =>
      assertPublication(
        { ...context, ...override },
        context.GITHUB_SHA,
        'success',
      ),
    );
  assert.throws(() => assertPublication(context, 'b'.repeat(40), 'success'));
});

test('production proof binds all files, source, target, repository and run; rejects gallery and foreign bytes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ap31-'));
  try {
    mkdirSync(join(directory, '.vite'));
    for (const [path, value] of Object.entries({
      'index.html': '<html>fixture</html>',
      'sw.js': '// fixture',
      '.vite/manifest.json': '{}',
      'build-target.json': JSON.stringify({ target: 'normal' }),
      'build-info.json': JSON.stringify({
        schemaVersion: 1,
        target: 'normal',
        sourceCommit: context.GITHUB_SHA,
      }),
    }))
      writeFileSync(join(directory, path), value);
    const proof = seal(directory, context);
    const check = (ctx = context, fingerprint = proof.fingerprint) =>
      verify(directory, proof, ctx, fingerprint);
    assert.doesNotThrow(() => check());
    for (const override of [
      { GITHUB_SHA: 'b'.repeat(40) },
      { GITHUB_REPOSITORY: 'fork/m8e-calc' },
      { GITHUB_RUN_ID: '456' },
      { GITHUB_RUN_ATTEMPT: '2' },
      { GITHUB_REF: 'refs/pull/1/merge' },
      { GITHUB_EVENT_NAME: 'pull_request' },
    ])
      assert.throws(() => check({ ...context, ...override }));
    assert.throws(() => check(context, 'f'.repeat(64)));
    assert.throws(() => check(context, ''));
    writeFileSync(join(directory, 'index.html'), '<html>foreign bytes</html>');
    assert.throws(() => check());
    writeFileSync(join(directory, 'index.html'), '<html>fixture</html>');
    writeFileSync(join(directory, 'extra.js'), 'extra');
    assert.throws(() => check());
    rmSync(join(directory, 'extra.js'));
    rmSync(join(directory, 'sw.js'));
    assert.throws(() => check());
    writeFileSync(join(directory, 'sw.js'), '// fixture');
    symlinkSync('index.html', join(directory, 'link'));
    assert.throws(() => check());
    rmSync(join(directory, 'link'));
    linkSync(join(directory, 'index.html'), join(directory, 'hardlink'));
    assert.throws(() => check());
    rmSync(join(directory, 'hardlink'));
    writeFileSync(
      join(directory, 'build-info.json'),
      JSON.stringify({
        schemaVersion: 1,
        target: 'gallery',
        sourceCommit: context.GITHUB_SHA,
      }),
    );
    assert.throws(() => seal(directory, context));
    assert.throws(() => check());
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
