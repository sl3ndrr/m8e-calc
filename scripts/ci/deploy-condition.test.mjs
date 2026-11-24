import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const workflow = readFileSync(
  new URL('../../.github/workflows/ci.yml', import.meta.url),
  'utf8',
).replaceAll('\r\n', '\n');
function condition(job) {
  const section = workflow
    .split(`\n  ${job}:\n`)[1]
    ?.split(/\n {2}[\w-]+:\n/, 1)[0];
  assert.ok(section, `${job} exists`);
  const expression =
    section.match(/\n {4}if: (?:>-\n *)?\$\{\{([\s\S]*?)\}\}/)?.[1] ?? 'true';
  return expression
    .trim()
    .replace(/\.([\w-]*-[\w-]+)\b/g, (_, id) => `[${JSON.stringify(id)}]`);
}

function eligible(overrides = {}, job = 'deploy') {
  const expression = condition(job);
  const {
    quality,
    artifact,
    build,
    promotion,
    promotedId,
    cancelled,
    github,
    ancestors,
  } = {
    quality: 'success',
    artifact: 'success',
    build: 'success',
    promotion: 'skipped',
    promotedId: '',
    cancelled: false,
    github: {},
    ancestors: ['success', 'skipped'],
    ...overrides,
  };
  // GitHub implicitly adds success() unless the expression has a status function.
  // Other conditional evidence may leave skipped ancestors in a workflow.
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
      build: { result: build },
      promotion: { result: promotion, outputs: { 'artifact-id': promotedId } },
      quality: { result: quality },
      'pages-package': { result: artifact },
    },
    cancelled: () => cancelled,
    always: () => true,
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
    for (const promotion of ['skipped', 'success'])
      assert.equal(
        eligible({ github, ancestors, promotion, promotedId: '56' }),
        false,
      );
});

test('a verified upload skips duplicate checks and is the only other route to Pages', () => {
  const promoted = {
    promotion: 'success',
    promotedId: '56',
    build: 'skipped',
    quality: 'skipped',
    artifact: 'skipped',
  };
  const roots = ['gate-tests', 'node-minimum', 'build'];
  for (const job of [...roots, 'quality'])
    assert.equal(eligible(promoted, job), false);
  assert.equal(eligible(promoted), true);
  assert.equal(eligible({ ...promoted, cancelled: true }), false);

  for (const fallback of [
    { ...promoted, promotedId: '' },
    { ...promoted, promotion: 'failure' },
    { ...promoted, promotion: 'skipped' },
  ]) {
    for (const job of roots) assert.equal(eligible(fallback, job), true);
    assert.equal(eligible({ ...fallback, build: 'success' }, 'quality'), true);
    assert.equal(eligible(fallback), false);
    assert.equal(
      eligible({ ...fallback, quality: 'success', artifact: 'success' }),
      true,
    );
  }
  for (const job of [...roots, 'quality'])
    assert.equal(
      eligible({ github: { event_name: 'pull_request' } }, job),
      true,
    );
});

test('all build consumers run after a successful PR or fallback build', () => {
  const consumers = [
    'qa',
    'provenance',
    'release-assets',
    'graph-performance',
    'gallery',
    'pages-package',
  ];
  const pullRequest = {
    github: { event_name: 'pull_request' },
    ancestors: ['skipped', 'success'],
  };
  const fallback = { promotion: 'failure', ancestors: ['failure', 'success'] };
  for (const job of consumers) {
    assert.equal(eligible(pullRequest, job), true, `${job} must run on a PR`);
    assert.equal(
      eligible(fallback, job),
      true,
      `${job} must run after fallback`,
    );
    assert.equal(eligible({ ...pullRequest, cancelled: true }, job), false);
    for (const build of ['failure', 'skipped', 'cancelled'])
      assert.equal(
        eligible({ ...fallback, build, ancestors: ['failure', build] }, job),
        false,
      );
  }
});
