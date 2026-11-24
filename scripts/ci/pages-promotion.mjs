import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  createReadStream,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionRepository } from './quality-status.mjs';

const commitPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^[a-f0-9]{64}$/;
const workflow = '.github/workflows/ci.yml';

function positiveId(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function only(items, message) {
  assert.equal(items.length, 1, message);
  return items[0];
}

export function createApproval(context, pull, sourceTree) {
  assert.equal(context.GITHUB_REPOSITORY, productionRepository);
  assert.equal(context.GITHUB_EVENT_NAME, 'pull_request');
  assert.equal(pull.base.ref, 'main');
  assert.equal(pull.base.repo.full_name, productionRepository);
  assert.equal(pull.head.repo.full_name, productionRepository);
  assert.ok(positiveId(pull.number));
  assert.equal(context.GITHUB_REF, `refs/pull/${pull.number}/merge`);
  assert.match(pull.head.sha, commitPattern);
  assert.match(context.GITHUB_SHA, commitPattern);
  assert.match(sourceTree, commitPattern);
  assert.match(context.PAGES_TAR_SHA256, digestPattern);
  const runId = Number(context.GITHUB_RUN_ID);
  const runAttempt = Number(context.GITHUB_RUN_ATTEMPT);
  const pagesArtifactId = Number(context.PAGES_ARTIFACT_ID);
  assert.ok([runId, runAttempt, pagesArtifactId].every(positiveId));
  assert.equal(context.PAGES_ARTIFACT_NAME, `pages-${runId}-${runAttempt}`);
  return {
    version: 1,
    repository: productionRepository,
    pullRequest: pull.number,
    headCommit: pull.head.sha,
    sourceCommit: context.GITHUB_SHA,
    sourceTree,
    runId,
    runAttempt,
    pagesArtifactId,
    tarSha256: context.PAGES_TAR_SHA256,
  };
}

export async function findPromotion(api, mainCommit, mainTree) {
  assert.match(mainCommit, commitPattern);
  assert.match(mainTree, commitPattern);
  const pulls = await api(`/commits/${mainCommit}/pulls?per_page=100`);
  const pull = only(
    pulls.filter(
      (entry) =>
        entry.merged_at &&
        entry.merge_commit_sha === mainCommit &&
        entry.base.ref === 'main' &&
        entry.base.repo.full_name === productionRepository &&
        entry.head.repo?.full_name === productionRepository,
    ),
    'No unique merged pull request from the upstream repository',
  );
  assert.ok(positiveId(pull.number));
  assert.match(pull.head.sha, commitPattern);

  const {
    workflow_runs: [latest],
  } = await api(
    `/actions/workflows/ci.yml/runs?event=pull_request&head_sha=${pull.head.sha}&per_page=1`,
  );
  assert.ok(positiveId(latest?.id), 'No PR CI run for the merged head');
  const run = await api(`/actions/runs/${latest.id}`);
  assert.equal(run.id, latest.id);
  assert.equal(run.path, workflow);
  assert.equal(run.event, 'pull_request');
  assert.equal(run.repository.full_name, productionRepository);
  assert.equal(run.head_repository.full_name, productionRepository);
  assert.equal(run.head_sha, pull.head.sha);
  assert.equal(run.head_branch, pull.head.ref);
  assert.equal(run.status, 'completed');
  assert.equal(run.conclusion, 'success');
  assert.ok(positiveId(run.run_attempt));

  // The run's head_sha identifies the source branch. Its reusable QA workflow
  // identifies the merge commit GitHub actually checked out for this PR.
  const ref = `refs/pull/${pull.number}/merge`;
  const checked = only(
    (run.referenced_workflows ?? []).filter(
      (entry) =>
        entry.ref === ref &&
        entry.path ===
          `${productionRepository}/.github/workflows/qa.yml@${entry.sha}`,
    ),
    'CI run does not identify the checked PR merge commit',
  );
  assert.match(checked.sha, commitPattern);

  const [source, { jobs }, { artifacts }] = await Promise.all([
    api(`/git/commits/${checked.sha}`),
    api(
      `/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`,
    ),
    api(`/actions/runs/${run.id}/artifacts?per_page=100`),
  ]);
  assert.equal(source.sha, checked.sha);
  assert.equal(source.parents.length, 2);
  assert.equal(source.parents[1].sha, pull.head.sha);
  assert.equal(source.tree.sha, mainTree, 'Checked PR tree differs from main');
  const gate = only(
    jobs.filter((job) => job.name === 'Quality gate'),
    'No unique Quality gate',
  );
  assert.equal(gate.run_id, run.id);
  assert.equal(gate.run_attempt, run.run_attempt);
  assert.equal(gate.status, 'completed');
  assert.equal(gate.conclusion, 'success');

  const suffix = `${run.id}-${run.run_attempt}`;
  const artifactId = (name) => {
    const artifact = only(
      artifacts.filter((entry) => entry.name === name),
      `Missing or ambiguous ${name}`,
    );
    assert.equal(artifact.expired, false, `Expired ${name}`);
    assert.ok(positiveId(artifact.id));
    return artifact.id;
  };

  return {
    approvalArtifactId: artifactId(`pages-approval-${suffix}`),
    expectedApproval: {
      version: 1,
      repository: productionRepository,
      pullRequest: pull.number,
      headCommit: pull.head.sha,
      sourceCommit: source.sha,
      sourceTree: mainTree,
      runId: run.id,
      runAttempt: run.run_attempt,
      pagesArtifactId: artifactId(`pages-${suffix}`),
    },
  };
}

export async function verifyArchive(expectedApproval, approval, archivePath) {
  const { tarSha256, ...identity } = approval;
  assert.deepEqual(
    identity,
    expectedApproval,
    'Approval does not match GitHub metadata',
  );
  assert.match(tarSha256, digestPattern);
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(archivePath)) hash.update(chunk);
  assert.equal(
    hash.digest('hex'),
    tarSha256,
    'Pages archive differs from the approved bytes',
  );
  return tarSha256;
}

async function githubApi(path) {
  const response = await fetch(
    `https://api.github.com/repos/${productionRepository}${path}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
      },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    },
  );
  assert.ok(response.ok, `GitHub API returned HTTP ${response.status}`);
  return response.json();
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [mode, path, approvalPath, archivePath] = process.argv.slice(2);
  const env = process.env;
  if (mode === 'approve' || mode === 'discover') {
    const git = (ref) =>
      execFileSync('git', ['rev-parse', ref], { encoding: 'utf8' }).trim();
    assert.equal(git('HEAD'), env.GITHUB_SHA);
    const tree = git('HEAD^{tree}');
    if (mode === 'approve') {
      const approval = createApproval(
        env,
        readJson(env.GITHUB_EVENT_PATH).pull_request,
        tree,
      );
      writeFileSync(path, JSON.stringify(approval) + '\n');
    } else {
      assert.equal(env.GITHUB_REPOSITORY, productionRepository);
      assert.equal(env.GITHUB_EVENT_NAME, 'push');
      assert.equal(env.GITHUB_REF, 'refs/heads/main');
      const { approvalArtifactId, expectedApproval } = await findPromotion(
        githubApi,
        env.GITHUB_SHA,
        tree,
      );
      writeFileSync(path, JSON.stringify(expectedApproval) + '\n');
      appendFileSync(
        env.GITHUB_OUTPUT,
        `run-id=${expectedApproval.runId}\napproval-id=${approvalArtifactId}\npages-id=${expectedApproval.pagesArtifactId}\n`,
      );
    }
  } else if (mode === 'verify') {
    const expected = readJson(path);
    const tarSha256 = await verifyArchive(
      expected,
      readJson(approvalPath),
      archivePath,
    );
    appendFileSync(
      env.GITHUB_OUTPUT,
      `tar-sha256=${tarSha256}\nsource-commit=${expected.sourceCommit}\n`,
    );
    appendFileSync(
      env.GITHUB_STEP_SUMMARY,
      `Verified Pages archive from PR #${expected.pullRequest}, run ${expected.runId}, attempt ${expected.runAttempt}.\n\n` +
        `Checked commit \`${expected.sourceCommit}\` and main commit \`${env.GITHUB_SHA}\` have tree \`${expected.sourceTree}\`.\n`,
    );
  } else throw Error('Expected approve, discover or verify');
}
