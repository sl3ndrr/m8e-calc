import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Disposable worktrees only: no overrides, peer bypass, audit filtering or writes
// to the checked product's manifest/lockfile. Every command keeps its exit code.
const output = resolve('test-results/wp09-security');
mkdirSync(output, { recursive: true });
const commands = [];
function run(name, command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  writeFileSync(`${output}/${name}.stdout`, result.stdout ?? '');
  writeFileSync(`${output}/${name}.stderr`, result.stderr ?? '');
  commands.push({ name, command, args, cwd, status: result.status });
  writeFileSync(`${output}/commands.json`, JSON.stringify(commands, null, 2));
  console.log(name, 'exit', result.status);
  return result;
}
assert.equal(run('npm', 'npm', ['--version']).stdout.trim(), '11.19.0');
run('node', 'node', ['--version']);
run('identity', 'git', ['show', '-s', '--format=fuller', 'HEAD']);
run('status', 'git', ['status', '--porcelain=v1']);
run('installed-tree', 'npm', ['ls', '--all', '--json']);
run('installed-minimatch', 'npm', ['explain', 'minimatch', '--json']);
run('installed-audit', 'npm', ['audit', '--json']);
const packages = [
  'minimatch',
  'minimatch@3',
  'minimatch@10',
  'eslint',
  'eslint@9',
  '@eslint/js',
  '@eslint/config-array',
  'typescript-eslint',
  '@typescript-eslint/typescript-estree',
  'eslint-plugin-jsx-a11y',
  'eslint-plugin-react-hooks',
];
for (const [index, name] of packages.entries()) {
  const result = run(`metadata-${index}`, 'npm', [
    'view',
    name,
    'version',
    'dist-tags',
    'dependencies',
    'peerDependencies',
    'engines',
    '--json',
  ]);
  assert.equal(result.status, 0, name);
}
const advisory = await fetch(
  'https://raw.githubusercontent.com/github/advisory-database/main/advisories/github-reviewed/2026/10/GHSA-g3hv-75wg-m249/GHSA-g3hv-75wg-m249.json',
);
assert.equal(advisory.status, 200);
writeFileSync(`${output}/advisory.json`, await advisory.text());
for (const variant of ['compatible', 'eslint-major']) {
  const cwd = resolve(process.env.RUNNER_TEMP, `wp09-${variant}`);
  assert.equal(
    run(`${variant}-worktree`, 'git', [
      'worktree',
      'add',
      '--detach',
      cwd,
      'HEAD',
    ]).status,
    0,
  );
  const args =
    variant === 'compatible'
      ? [
          'update',
          'eslint',
          '@eslint/js',
          'typescript-eslint',
          'eslint-plugin-jsx-a11y',
          '--package-lock-only',
          '--engine-strict',
        ]
      : [
          'install',
          '--save-dev',
          'eslint@latest',
          '@eslint/js@latest',
          'typescript-eslint@latest',
          'eslint-plugin-jsx-a11y@latest',
          '--package-lock-only',
          '--engine-strict',
        ];
  const update = run(`${variant}-resolve`, 'npm', args, cwd);
  run(
    `${variant}-diff`,
    'git',
    ['diff', '--', 'package.json', 'package-lock.json'],
    cwd,
  );
  if (update.status !== 0) continue;
  writeFileSync(
    `${output}/${variant}-package.json`,
    readFileSync(`${cwd}/package.json`),
  );
  writeFileSync(
    `${output}/${variant}-lock.json`,
    readFileSync(`${cwd}/package-lock.json`),
  );
  const install = run(`${variant}-ci`, 'npm', ['ci', '--engine-strict'], cwd);
  if (install.status !== 0) continue;
  run(`${variant}-tree`, 'npm', ['ls', '--all', '--json'], cwd);
  run(`${variant}-minimatch`, 'npm', ['explain', 'minimatch', '--json'], cwd);
  run(`${variant}-audit`, 'npm', ['audit', '--json'], cwd);
  run(`${variant}-check`, 'npm', ['run', 'check'], cwd);
}
// Success means evidence collection completed, never that an audit passed.
console.log(JSON.stringify(commands, null, 2));
