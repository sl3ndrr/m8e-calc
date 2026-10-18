import { build } from 'vite';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

// Synthetic provenance, never a claim about two historical source revisions.
export const commits = { a: 'a'.repeat(40), b: 'b'.repeat(40) };
export default async function prepare() {
  const original = process.env.GITHUB_SHA;
  const results = [];
  try {
    for (const label of ['a', 'b', 'local', 'gallery']) {
      const sha = commits[label];
      if (sha) process.env.GITHUB_SHA = sha;
      else delete process.env.GITHUB_SHA;
      const directory = `test-results/ap29-builds/${label}`;
      await build({
        mode: label === 'gallery' ? 'gallery' : 'production',
        build: { outDir: directory },
        plugins: [{
          name: 'ap29-fixture-marker',
          transformIndexHtml: {
            order: 'pre',
            handler: (html) => html.replace('</head>', `<meta name="ap29-fixture" content="${label}"></head>`),
          },
        }],
      });
      const result = spawnSync(process.execPath, ['scripts/check-build-target.mjs', directory, label === 'gallery' ? 'gallery' : 'normal'], { env: process.env, encoding: 'utf8' });
      results.push({ label, sourceCommit: sha ?? null, status: result.status, stdout: result.stdout, stderr: result.stderr });
      if (result.status !== 0) throw Error(`Build-target check failed for ${label}: ${result.stderr}`);
    }
    const mismatch = spawnSync(process.execPath, ['scripts/check-build-target.mjs', 'test-results/ap29-builds/a'], { env: { ...process.env, GITHUB_SHA: commits.b }, encoding: 'utf8' });
    results.push({ label: 'reject-a-as-b', status: mismatch.status, stdout: mismatch.stdout, stderr: mismatch.stderr });
    if (mismatch.status !== 1 || !mismatch.stderr.includes('AssertionError')) throw Error('Build A was not rejected as build B');
  } finally {
    if (original === undefined) delete process.env.GITHUB_SHA;
    else process.env.GITHUB_SHA = original;
    await mkdir('test-results/ap29-builds', { recursive: true });
    await writeFile('test-results/ap29-builds/checks.json', JSON.stringify(results, null, 2));
  }
}
