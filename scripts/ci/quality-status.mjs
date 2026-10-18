import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const required = [
  'build',
  'gate-tests',
  'qa',
  'graph-performance',
  'gallery',
  'provenance',
  'release-assets',
  'pages-package',
];

export function assertSuccessful(needs, jobs = required) {
  assert.deepEqual(
    Object.keys(needs).sort(),
    [...jobs].sort(),
    'Exact prerequisite set',
  );
  for (const job of jobs)
    assert.equal(needs[job]?.result, 'success', `${job} must succeed`);
}

export function assertPublication(context, latest, quality) {
  assert.equal(quality, 'success', 'Quality must succeed');
  assert.equal(context.GITHUB_REPOSITORY, 'sl3ndrr/m8e-calc');
  assert.equal(context.GITHUB_EVENT_NAME, 'push');
  assert.equal(context.GITHUB_REF, 'refs/heads/main');
  assert.match(context.GITHUB_SHA, /^[a-f0-9]{40}$/);
  assert.equal(context.GITHUB_SHA, latest, 'Only the current main may publish');
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const mode = process.argv[2];
  if (mode === 'quality') assertSuccessful(JSON.parse(process.env.NEEDS));
  else if (mode === 'qa')
    assertSuccessful(JSON.parse(process.env.NEEDS), [
      'measure',
      'browsers',
      'visual',
    ]);
  else if (mode === 'publish')
    assertPublication(
      process.env,
      process.env.LATEST_MAIN,
      process.env.QUALITY_RESULT,
    );
  else throw Error('Expected quality, qa or publish');
  console.log(`${mode}: all prerequisites satisfied`);
}
