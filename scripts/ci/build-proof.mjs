import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  lstatSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fields = [
  'GITHUB_REPOSITORY',
  'GITHUB_SHA',
  'GITHUB_REF',
  'GITHUB_EVENT_NAME',
  'GITHUB_RUN_ID',
  'GITHUB_RUN_ATTEMPT',
];

function identity(context) {
  const values = Object.fromEntries(
    fields.map((key) => {
      assert.ok(context[key], `Missing ${key}`);
      return [key, context[key]];
    }),
  );
  assert.match(values.GITHUB_SHA, /^[a-f0-9]{40}$/);
  return values;
}

function files(directory, relative = '') {
  return readdirSync(join(directory, relative))
    .sort()
    .flatMap((name) => {
      const path = relative ? `${relative}/${name}` : name;
      const entry = lstatSync(join(directory, path));
      assert.ok(!entry.isSymbolicLink(), `No symlinks: ${path}`);
      if (entry.isDirectory()) return files(directory, path);
      assert.ok(entry.isFile(), `Only regular files: ${path}`);
      assert.equal(entry.nlink, 1, `No hardlinks: ${path}`);
      return [
        {
          path,
          size: entry.size,
          sha256: sha256(readFileSync(join(directory, path))),
        },
      ];
    });
}

function payload(directory, context) {
  const build = JSON.parse(readFileSync(join(directory, 'build-info.json')));
  assert.equal(build.schemaVersion, 1);
  assert.equal(build.target, 'normal', 'Only production bytes');
  assert.equal(build.sourceCommit, context.GITHUB_SHA);
  assert.equal(
    JSON.parse(readFileSync(join(directory, 'build-target.json'))).target,
    'normal',
  );
  const entries = files(directory);
  for (const name of ['index.html', 'sw.js', '.vite/manifest.json'])
    assert.ok(
      entries.some((file) => file.path === name),
      `Missing ${name}`,
    );
  return {
    schemaVersion: 1,
    identity: identity(context),
    target: 'normal',
    basePath: '/m8e-calc/',
    files: entries,
  };
}

export function seal(directory, context) {
  const value = payload(directory, context);
  return { ...value, fingerprint: sha256(JSON.stringify(value)) };
}

export function verify(directory, proof, context, expectedFingerprint) {
  assert.match(
    expectedFingerprint ?? '',
    /^[a-f0-9]{64}$/,
    'Producer fingerprint required',
  );
  assert.equal(proof.fingerprint, expectedFingerprint);
  assert.deepEqual(
    proof,
    seal(directory, context),
    'Exact source, run, target and bytes',
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [mode, directory = 'dist', proofPath = 'build-proof.json'] =
    process.argv.slice(2);
  if (mode === 'seal') {
    const proof = seal(directory, process.env);
    writeFileSync(proofPath, JSON.stringify(proof, null, 2) + '\n');
    if (process.env.GITHUB_OUTPUT)
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `fingerprint=${proof.fingerprint}\n`,
      );
    console.log(`normal build fingerprint: ${proof.fingerprint}`);
  } else if (mode === 'verify') {
    verify(
      directory,
      JSON.parse(readFileSync(proofPath)),
      process.env,
      process.env.BUILD_FINGERPRINT,
    );
    console.log(
      `Verified exact production bytes: ${process.env.BUILD_FINGERPRINT}`,
    );
  } else throw Error('Expected seal or verify');
}
