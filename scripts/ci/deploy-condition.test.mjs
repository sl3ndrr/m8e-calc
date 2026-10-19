import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const workflow = readFileSync(
  new URL('../../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);
const deploy = workflow.split('\n  deploy:\n')[1];
assert.ok(deploy, 'Production deployment job exists');
const expression = deploy
  .match(/\n    if: >-\n([\s\S]*?)\n    runs-on:/)[1]
  .trim()
  .replace(/^\$\{\{\s*|\s*\}\}$/g, '')
  .replace(/\bneeds\.([\w-]+)/g, (_, id) => `needs[${JSON.stringify(id)}]`);

function eligible(overrides = {}) {
  const { quality, artifact, cancelled, github, ancestors } = {
    quality: 'success',
    artifact: 'success',
    cancelled: false,
    github: {},
    ancestors: ['success', 'skipped'],
    ...overrides,
  };
  // GitHub implicitly adds success() unless the expression has a status function.
  // The allowed currency-source skip remains in the transitive needs chain.
  if (
    !/\b(?:always|cancelled|failure|success)\s*\(/.test(expression) &&
    ancestors.some((status) => status !== 'success')
  )
    return false;
  return runInNewContext(expression, {
    github: {
      event_name: 'push',
      ref: 'refs/heads/main',
      repository: 'sl3ndrr/m8e-calc',
      ...github,
    },
    needs: {
      quality: { result: quality },
      'pages-package': { result: artifact },
    },
    cancelled: () => cancelled,
  });
}

test('actual deploy condition admits green main with the expected ancestor skip', () => {
  assert.equal(eligible(), true);
  assert.equal(eligible({ ancestors: ['success', 'success'] }), true);
});

test('actual deploy condition denies cancellation, bad prerequisites and foreign contexts', () => {
  const ancestors = ['success', 'success'];
  assert.equal(eligible({ cancelled: true, ancestors }), false);
  for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
    assert.equal(eligible({ quality: result, ancestors }), false);
    assert.equal(eligible({ artifact: result, ancestors }), false);
  }
  for (const github of [
    { event_name: 'pull_request' },
    { event_name: 'workflow_run' },
    { ref: 'refs/heads/feature' },
    { repository: 'fork/m8e-calc' },
  ])
    assert.equal(eligible({ github, ancestors }), false);
});
