import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { test } from 'node:test';
import { checkDocuments, checkExternalUrl, manualReviews } from '../check-release-docs.mjs';

test('real local HTTP: success, redirect, hard errors, transient errors and exact manual decisions', async (t) => {
  const calls = new Map();
  const server = createServer((req, res) => {
    const n = (calls.get(req.url) ?? 0) + 1;
    calls.set(req.url, n);
    if (req.url === '/disconnect') return req.socket.destroy();
    if (req.url === '/timeout') return; // Closed explicitly in cleanup.
    if (req.url === '/redirect' || req.url === '/redirect-block') {
      res.writeHead(302, { Location: req.url === '/redirect' ? '/ok' : '/blocked' });
    } else {
      const status = { '/missing': 404, '/bad': 400, '/blocked': 403,
        '/blocked-other': 403, '/limited': 429, '/transient': n === 1 ? 503 : 200 }[req.url.split('?')[0]] ?? 200;
      res.writeHead(status);
    }
    res.end('fixture');
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const check = (path, options) => checkExternalUrl(`${base}${path}`, options);
  const ok = await check('/ok');
  assert.equal(ok.category, 'http-success');
  assert.equal(ok.httpPassed, true);
  assert.equal(ok.accepted, true);
  assert.equal(ok.attempt, 1);
  const redirect = await check('/redirect');
  assert.equal(redirect.originalUrl, `${base}/redirect`);
  assert.equal(redirect.finalUrl, `${base}/ok`);
  assert.equal(redirect.status, 200);
  for (const [path, status, category] of [
    ['/missing', 404, 'http-error'], ['/bad', 400, 'http-error'],
    ['/limited', 429, 'http-transient-error'], ['/transient', 503, 'http-transient-error'],
  ]) {
    const result = await check(path);
    assert.equal(result.category, category);
    assert.equal(result.status, status);
    assert.equal(result.accepted, false);
    assert.equal(result.httpPassed, false);
    assert.match(result.reason, new RegExp(`HTTP ${status}`));
    assert.equal(calls.get(path), 1); // No implicit retry, even for temporary errors.
  }
  assert.equal((await check('/transient')).httpPassed, true);
  const review = { url: `${base}/blocked`, status: 403, reviewedOn: '2026-10-18', evidence: 'Local fixture only' };
  const reviewed = await check('/blocked', { reviews: [review] });
  assert.equal(reviewed.category, 'manually-reviewed-client-block');
  assert.equal(reviewed.accepted, true);
  assert.equal(reviewed.httpPassed, false);
  assert.deepEqual(reviewed.manualReview, review);
  for (const [path, entry] of [
    ['/blocked-other', review], ['/blocked?query=1', review],
    ['/blocked', { ...review, status: 400 }],
    ['/redirect-block', { ...review, url: `${base}/redirect-block` }],
  ]) {
    const result = await check(path, { reviews: [entry] });
    assert.equal(result.accepted, false);
    assert.equal(result.manualReview, null);
  }
  const transport = await check('/disconnect');
  assert.equal(transport.category, 'transport-error');
  assert.equal(transport.status, null);
  assert.equal(transport.finalUrl, null); // No response: never invent a redirect target.
  assert.ok(transport.errorCode);
  assert.ok(transport.reason);
  const timeout = await check('/timeout', { timeoutMs: 20 });
  assert.equal(timeout.category, 'timeout');
  assert.equal(timeout.accepted, false);
  assert.equal(timeout.status, null);
});

test('production exceptions remain the two original exact URL/403 decisions', () => {
  assert.deepEqual(manualReviews.map(({ url, status, reviewedOn }) => ({ url, status, reviewedOn })), [
    { url: 'https://www.iso.org/standard/7472.html', status: 403, reviewedOn: '2026-10-14' },
    { url: 'https://www.hhs.gov/guidance/document/guidance-industry-guidelines-determining-metric-equivalents-household-measures', status: 403, reviewedOn: '2026-10-14' },
  ]);
  assert.ok(manualReviews.every((entry) => entry.evidence));
});

test('document scan and CLI keep local/npm gates and persist JSON before failure', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'ap37-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'docs'));
  await writeFile(join(root, 'package.json'), JSON.stringify({ scripts: { build: 'fixture' } }));
  for (const name of ['README.md', 'CHANGELOG.md', 'AGENTS.md']) await writeFile(join(root, name), '');
  await writeFile(join(root, 'docs/fixture.md'), '[ok](../README.md#heading)\nnpm run build\n');
  let report = await checkDocuments({ root });
  assert.equal(report.summary.failures, 0);
  assert.equal(report.summary.localLinks, 1);
  assert.equal(report.summary.npmCommands, 1);
  await writeFile(join(root, 'docs/fixture.md'), '[broken](missing.md)\nnpm run nonexistent\nnpm run toString\n');
  report = await checkDocuments({ root });
  assert.deepEqual(report.results.map((r) => r.category), ['unknown-npm-command', 'unknown-npm-command', 'local-link-error']);
  const cli = resolve('scripts/check-release-docs.mjs');
  const code = await new Promise((done, reject) => {
    const child = spawn(process.execPath, [cli, '--report', 'reports/docs.json'], { cwd: root, stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', done);
  });
  assert.equal(code, 1);
  const saved = JSON.parse(await readFile(join(root, 'reports/docs.json'), 'utf8'));
  assert.equal(saved.schemaVersion, 1);
  assert.equal(saved.summary.failures, 3);
  assert.equal(saved.results.at(-1).link, 'missing.md');
  assert.equal(saved.results.at(-1).errorCode, 'ENOENT');
});
