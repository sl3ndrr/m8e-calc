// Supplemental evidence only: no React, DOM, full typecheck or browser emulation.
// Pass TypeScript 5.9.3 and Decimal 10.6.0 module paths; npm ci remains mandatory.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require(resolve(process.argv[2]));
const decimal = require(resolve(process.argv[3]));
assert.equal(ts.version, '5.9.3');
const base = '9b5b3736d8fdeb2d2706658e04bfc357883c3134';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
const files = [
  ...new Set([
    ...git('diff', '--name-only', base).trim().split('\n'),
    ...git('ls-files', '--others', '--exclude-standard').trim().split('\n'),
  ]),
].filter((path) => /\.tsx?$/.test(path));
const hashes = {};
for (const path of files) {
  const source = readFileSync(path, 'utf8');
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  assert.equal(file.parseDiagnostics.length, 0, path);
  const result = ts.transpileModule(source, {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  });
  assert.equal(result.diagnostics.length, 0, path);
  hashes[path] = createHash('sha256').update(source).digest('hex');
}
const cache = new Map();
function load(path) {
  path = resolve(path);
  if (!path.endsWith('.ts'))
    path = existsSync(path + '.ts') ? path + '.ts' : path + '/index.ts';
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInThisContext(`(function(module, exports, require) {${source}\n})`, {
    filename: path,
  })(module, module.exports, (specifier) => {
    if (specifier === 'decimal.js') return decimal;
    assert.ok(specifier.startsWith('.'), specifier);
    return load(resolve(dirname(path), specifier));
  });
  return module.exports;
}
const { t, de, en } = load('src/shared/i18n/extended.ts');
assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
assert.equal(
  t('convert.valueRegion', 'de', { unit: 'Meter' }),
  'Vollständiger Wert für Meter',
);
assert.equal(
  t('convert.valueRegion', 'en', { unit: 'metre' }),
  'Complete value for metre',
);
const {
  initialConvertState,
  convertReducer,
  resultsFor,
  numericText,
  quantity,
} = load('src/features/convert/model.ts');
const digits = '2345678901234567890123456789012345678901234567891';
assert.equal(digits.length + 1, 50);
const fixtures = [
  ['0', '0'],
  ['-1e-9', '-1e-7'],
  ['-1e-10000', '-1e-9998'],
  ['1e10000', '1e+10002'],
  [`-1.${digits}e-10000`, `-1.${digits}e-9998`],
  [`-0.${'0'.repeat(1200)}1${digits}`, `-1.${digits}e-1199`],
];
const cases = [];
for (const locale of ['de', 'en']) {
  const loc = (text) => (locale === 'de' ? text.replace('.', ',') : text);
  const options = { locale, grouping: false, digits: 50 };
  for (const [input, expected] of fixtures) {
    const state = convertReducer(initialConvertState(), {
      type: 'query',
      text: `${loc(input)} m in cm`,
      locale,
    });
    assert.equal(state.error, null);
    assert.equal(state.toId, 'cm');
    const values = resultsFor(state);
    assert.equal(numericText(values.cm, 'cm', options), loc(expected));
    assert.equal(quantity(values.cm, 'cm', options), loc(expected) + ' cm');
    const swapped = convertReducer(state, { type: 'swap' });
    assert.equal(swapped.value, values.cm);
    const back = convertReducer(swapped, { type: 'swap' });
    assert.equal(back.value, state.value);
    cases.push({
      locale,
      inputLength: input.length,
      result: loc(expected),
      swaps: 2,
    });
  }
  const state = convertReducer(initialConvertState(), {
    type: 'query',
    text: `${loc(`-1.${digits}e-10000`)} km in m`,
    locale,
  });
  assert.equal(state.error, null);
  assert.equal(
    numericText(resultsFor(state).m, 'm', options),
    loc(`-1.${digits}e-9997`),
  );
  cases.push({ locale, target: 'm', result: loc(`-1.${digits}e-9997`) });
}
git(
  'diff',
  '--exit-code',
  base,
  '--',
  'src/engine',
  'src/units',
  'src/graph',
  'src/ui',
  'src/styles',
  'src/features/convert/model.ts',
  'src/features/convert/preferences.ts',
  'package.json',
  'package-lock.json',
  '.github',
);
console.log(
  JSON.stringify(
    {
      kind: 'supplementary source/translator/reducer probe; no npm-check or browser claim',
      base,
      node: process.version,
      typescript: ts.version,
      parsedFiles: files.length,
      dictionaryKeys: Object.keys(de).length,
      cases,
      preservedDomainsToolchainUiTokensWorkflows: true,
      hashes,
    },
    null,
    2,
  ),
);
