import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  createApproval,
  findPromotion,
  verifyArchive,
} from './pages-promotion.mjs';
import { productionRepository } from './quality-status.mjs';

const head = 'a'.repeat(40);
const source = 'b'.repeat(40);
const merged = 'c'.repeat(40);
const tree = 'd'.repeat(40);
const ref = 'refs/pull/42/merge';
const branch = 'fix/example';
const repository = { full_name: productionRepository };
const associate = `/commits/${merged}/pulls?per_page=100`;
const findRun = `/actions/workflows/ci.yml/runs?event=pull_request&head_sha=${head}&per_page=1`;
const run = '/actions/runs/123';
const gitCommit = `/git/commits/${source}`;
const jobs = `${run}/attempts/2/jobs?per_page=100`;
const artifacts = `${run}/artifacts?per_page=100`;

function fixture() {
  return {
    [associate]: [
      {
        number: 42,
        merged_at: '2026-11-24T17:00:00Z',
        merge_commit_sha: merged,
        base: { ref: 'main', repo: repository },
        head: { ref: branch, repo: repository, sha: head },
      },
    ],
    [findRun]: { workflow_runs: [{ id: 123 }] },
    [run]: {
      id: 123,
      path: '.github/workflows/ci.yml',
      event: 'pull_request',
      repository,
      head_repository: repository,
      head_sha: head,
      head_branch: branch,
      status: 'completed',
      conclusion: 'success',
      run_attempt: 2,
      referenced_workflows: [
        {
          path: `${productionRepository}/.github/workflows/qa.yml@${source}`,
          ref,
          sha: source,
        },
      ],
    },
    [gitCommit]: {
      sha: source,
      tree: { sha: tree },
      parents: [{ sha: 'f'.repeat(40) }, { sha: head }],
    },
    [jobs]: {
      jobs: [
        {
          name: 'Quality gate',
          run_id: 123,
          run_attempt: 2,
          status: 'completed',
          conclusion: 'success',
        },
      ],
    },
    [artifacts]: {
      artifacts: [
        { id: 41, name: 'pages-approval-123-1', expired: false },
        { id: 51, name: 'pages-123-1', expired: false },
        { id: 42, name: 'pages-approval-123-2', expired: false },
        { id: 52, name: 'pages-123-2', expired: false },
      ],
    },
  };
}

const discover = (data, mainTree = tree) =>
  findPromotion(
    async (path) => {
      assert.ok(Object.hasOwn(data, path), `Unexpected GitHub request ${path}`);
      return data[path];
    },
    merged,
    mainTree,
  );

test('same Git tree promotes only the successful attempt and exact approved tar', async () => {
  const data = fixture();
  const { approvalArtifactId, expectedApproval } = await discover(data);
  assert.equal(approvalArtifactId, 42);
  assert.equal(expectedApproval.pagesArtifactId, 52);
  assert.equal(expectedApproval.sourceCommit, source);
  assert.notEqual(source, merged);

  const bytes = 'verified Pages archive fixture';
  const digest = createHash('sha256').update(bytes).digest('hex');
  const context = {
    GITHUB_REPOSITORY: productionRepository,
    GITHUB_EVENT_NAME: 'pull_request',
    GITHUB_REF: ref,
    GITHUB_SHA: source,
    GITHUB_RUN_ID: '123',
    GITHUB_RUN_ATTEMPT: '2',
    PAGES_ARTIFACT_ID: '52',
    PAGES_ARTIFACT_NAME: 'pages-123-2',
    PAGES_TAR_SHA256: digest,
  };
  const approval = createApproval(context, data[associate][0], tree);
  assert.throws(() =>
    createApproval(
      { ...context, GITHUB_REF: 'refs/heads/main' },
      data[associate][0],
      tree,
    ),
  );
  assert.throws(() =>
    createApproval(
      { ...context, GITHUB_RUN_ATTEMPT: '3' },
      data[associate][0],
      tree,
    ),
  );
  const directory = mkdtempSync(join(tmpdir(), 'pages-promotion-'));
  try {
    const archive = join(directory, 'artifact.tar');
    writeFileSync(archive, bytes);
    assert.equal(
      await verifyArchive(expectedApproval, approval, archive),
      digest,
    );
    for (const change of [
      { runId: 124 },
      { runAttempt: 1 },
      { pagesArtifactId: 51 },
      { headCommit: merged },
      { sourceCommit: merged },
      { sourceTree: merged },
      { pullRequest: 21 },
      { repository: 'fork/m8e-calc' },
      { tarSha256: 'invalid' },
    ])
      await assert.rejects(
        verifyArchive(expectedApproval, { ...approval, ...change }, archive),
      );
    writeFileSync(archive, 'modified');
    await assert.rejects(
      verifyArchive(expectedApproval, approval, archive),
      /approved bytes/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('a different main tree requires full CI', async () => {
  await assert.rejects(
    discover(fixture(), 'e'.repeat(40)),
    /Checked PR tree differs from main/,
  );
});

test('an absent, foreign or ambiguous PR and an unrelated check require full CI', async () => {
  for (const change of [
    (data) => {
      data[associate] = [];
    },
    (data) => {
      data[associate].push(data[associate][0]);
    },
    (data) => {
      data[associate][0].head.repo = { full_name: 'fork/m8e-calc' };
    },
    (data) => {
      data[associate][0].merge_commit_sha = source;
    },
    (data) => {
      data[run].path = '.github/workflows/other.yml';
    },
    (data) => {
      data[run].referenced_workflows[0].ref = 'refs/pull/99/merge';
    },
    (data) => {
      data[gitCommit].parents[1].sha = merged;
    },
  ]) {
    const data = fixture();
    change(data);
    await assert.rejects(discover(data));
  }
});

test('missing provenance, ambiguous or expired artifacts and incomplete CI require full CI', async () => {
  for (const change of [
    (data) => {
      data[run].conclusion = 'failure';
    },
    (data) => {
      data[run].status = 'in_progress';
    },
    (data) => {
      data[jobs].jobs = [];
    },
    (data) => {
      data[jobs].jobs[0].conclusion = 'skipped';
    },
    (data) => {
      data[jobs].jobs[0].run_attempt = 1;
    },
    (data) => {
      data[artifacts].artifacts.pop();
    },
    (data) => {
      data[artifacts].artifacts.splice(2, 1);
    },
    (data) => {
      data[artifacts].artifacts[3].expired = true;
    },
    (data) => {
      data[artifacts].artifacts.push(data[artifacts].artifacts[3]);
    },
  ]) {
    const data = fixture();
    change(data);
    await assert.rejects(discover(data));
  }
});
