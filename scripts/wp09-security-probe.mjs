import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const output = resolve('test-results/wp09-security');
mkdirSync(output, { recursive: true });
const commands = [];
function run(name, command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, {
    cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  writeFileSync(`${output}/${name}.stdout`, result.stdout ?? '');
  writeFileSync(`${output}/${name}.stderr`, result.stderr ?? '');
  commands.push({ name, command, args, status: result.status });
  writeFileSync(`${output}/commands.json`, JSON.stringify(commands, null, 2));
  console.log(name, 'exit', result.status);
  return result;
}
assert.equal(run('npm', 'npm', ['--version']).stdout.trim(), '11.19.0');
console.log(run('node', 'node', ['--version']).stdout);
assert.match(process.version, /^v24\.22\./);
const packages = ['eslint', '@eslint/config-array', '@eslint/eslintrc',
  'eslint-plugin-jsx-a11y', '@typescript-eslint/typescript-estree'];
for (const name of packages) {
  const directory = resolve('node_modules', name);
  const pkg = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'));
  const req = createRequire(resolve(directory, 'package.json'));
  console.log('PARENT', name, pkg.version, 'RESOLVES', req.resolve('minimatch'));
  for (const file of readdirSync(directory, { recursive: true }).sort()) {
    if (!/\.(?:js|cjs|mjs)$/.test(file) || file.includes('node_modules/')) continue;
    const source = readFileSync(resolve(directory, file), 'utf8');
    if (!/['"]minimatch['"]/.test(source)) continue;
    const lines = source.split('\n');
    const selected = new Set();
    lines.forEach((line, i) => {
      if (/minimatch|Minimatch|matchOne|makeRe|\.match\(|\.set\b|\.pattern\b|\.options\b/.test(line)) {
        for (let j = Math.max(0, i - 4); j <= Math.min(lines.length - 1, i + 5); j++) selected.add(j);
      }
    });
    console.log('SOURCE', name, file);
    for (const i of [...selected].sort((a,b) => a-b)) console.log(`${i + 1}: ${lines[i]}`);
  }
}
const apiDirectory = resolve(process.env.RUNNER_TEMP, 'wp09-minimatch-api');
mkdirSync(apiDirectory);
writeFileSync(resolve(apiDirectory, 'package.json'), '{"private":true,"type":"module"}');
assert.equal(run('minimatch-api-install', 'npm', [
  'install', '--save-exact', 'minimatch@11.0.3', '--engine-strict'
], apiDirectory).status, 0);
console.log(readFileSync(resolve(apiDirectory, 'node_modules/minimatch/package.json'), 'utf8'));
const req = createRequire(resolve(apiDirectory, 'package.json'));
const cjs = req('minimatch');
const esm = await import(req.resolve('minimatch').replace('/commonjs/', '/esm/'));
console.log('MINIMATCH11 EXPORTS', JSON.stringify({
  cjsType: typeof cjs, cjsKeys: Object.keys(cjs), esmKeys: Object.keys(esm),
  instanceMembers: Object.getOwnPropertyNames(cjs.Minimatch.prototype),
}));
const source = readFileSync(req.resolve('minimatch'), 'utf8');
console.log('MINIMATCH11 SOURCE', source.split('\n').filter(line =>
  /exports\.|firstPhasePreProcess|optimizationLevel|matchOne|makeRe/.test(line)).join('\n'));
const main = resolve(process.env.RUNNER_TEMP, 'wp09-main-audit');
assert.equal(run('main-fetch', 'git', ['fetch', '--no-tags', 'origin',
  '9b5b3736d8fdeb2d2706658e04bfc357883c3134']).status, 0);
assert.equal(run('main-worktree', 'git', ['worktree', 'add', '--detach', main,
  '9b5b3736d8fdeb2d2706658e04bfc357883c3134']).status, 0);
const audit = run('main-audit', 'npm', ['audit', '--json'], main);
console.log('MAIN AUDIT EXIT', audit.status);
const report = JSON.parse(audit.stdout);
console.log('MAIN AUDIT', JSON.stringify({
  metadata: report.metadata,
  minimatch: report.vulnerabilities?.minimatch,
}, null, 2));
assert.equal(audit.status, 1);
assert.ok(report.vulnerabilities.minimatch.via.some(v => typeof v === 'object' &&
  v.url.endsWith('GHSA-g3hv-75wg-m249')));
