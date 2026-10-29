// Supplemental source probe; deliberately no React, DOM, axe or browser emulation.
// Run from repository root, passing an available TypeScript 5.9.3 entry point.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require(resolve(process.argv[2]));
assert.equal(ts.version, '5.9.3');
const base = '7525d315184f83c23406671a488241856e594d0e';
const read = (path) => readFileSync(path, 'utf8');
const original = (path) =>
  execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8' });
const parse = (path, source) =>
  ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
const cache = new Map();
function load(path) {
  path = resolve(path);
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const js = ts.transpileModule(read(path), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInThisContext(`(function(module, exports, require) {${js}\n})`, {
    filename: path,
  })(module, module.exports, (specifier) => {
    assert.ok(specifier.startsWith('.'), specifier);
    return load(resolve(dirname(path), `${specifier}.ts`));
  });
  return module.exports;
}
// Executes the repository's actual translators, not a copied replacement.
const { t, de, en } = load('src/shared/i18n/extended.ts');
assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
function label(path, source, className) {
  const file = parse(path, source);
  let expression;
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
      if (
        attributes.some(
          (a) =>
            a.name.getText(file) === 'className' &&
            a.initializer &&
            ts.isStringLiteral(a.initializer) &&
            a.initializer.text === className,
        )
      ) {
        const name = attributes.find(
          (a) => a.name.getText(file) === 'aria-label',
        );
        assert.ok(name?.initializer && ts.isJsxExpression(name.initializer));
        expression = name.initializer.expression?.getText(file);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(expression, className);
  return expression;
}
const display = 'src/ui/keypad/CalculatorDisplay.tsx';
const history = 'src/app/HistorySheet.tsx';
const cases = [];
for (const locale of ['de', 'en']) {
  for (const [key, visible] of [
    ['MC', 'MC'],
    ['MR', 'MR'],
    ['MS', 'MS'],
    ['M+', 'M+'],
    ['M-', 'M−'],
    ['clearEntry', 'CE'],
    ['sqrt', '√x'],
    ['square', 'x²'],
    ['reciprocal', '1/x'],
  ]) {
    assert.ok(t(`simple.${key}`, locale).includes(visible));
    cases.push({ locale, key, visible });
  }
  for (const value of [
    '15',
    '−1,23456789012345e+100',
    '1,234,567,890,123,456',
  ]) {
    const context = { value, copyLabel: t('simple.copy', locale) };
    const before = vm.runInNewContext(
      label(display, original(display), 'calculator-result'),
      context,
    );
    const after = vm.runInNewContext(
      label(display, read(display), 'calculator-result'),
      context,
    );
    assert.ok(!before.includes(value));
    assert.equal(after, `${value} · ${context.copyLabel}`);
    cases.push({ locale, value, before, after });
  }
  for (const entry of [
    { input: '12 + 3', result: '15' },
    {
      input: 'v = 12345.678901234567890123456789',
      result: 'gespeichert / saved',
    },
    { input: '5 km → m', result: '5.000 m' },
    { input: 'sin(x) ; x^2', result: '2 Funktionen / functions' },
  ]) {
    const context = { t, locale, entry };
    const before = vm.runInNewContext(
      label(history, original(history), 'history-restore'),
      context,
    );
    const after = vm.runInNewContext(
      label(history, read(history), 'history-restore'),
      context,
    );
    assert.ok(!before.includes(entry.result));
    assert.equal(
      after,
      t('history.restore', locale, { input: `${entry.input} ${entry.result}` }),
    );
    cases.push({ locale, entry, before, after });
  }
}
const reference = 'src/features/scientific/ReferencePanels.tsx';
assert.equal(
  read(reference),
  original(reference),
  'Preserve the existing WP-02 implementation',
);
const oldLock = JSON.parse(original('package-lock.json'));
const newLock = JSON.parse(read('package-lock.json'));
const allowed = new Set([
  'node_modules/@axe-core/playwright',
  'node_modules/@axe-core/playwright/node_modules/axe-core',
  'node_modules/@playwright/test',
  'node_modules/playwright',
  'node_modules/playwright-core',
]);
for (const path of new Set([
  ...Object.keys(oldLock.packages),
  ...Object.keys(newLock.packages),
])) {
  if (!path || allowed.has(path)) continue;
  assert.deepEqual(newLock.packages[path], oldLock.packages[path], path);
}
const files = execFileSync('git', ['diff', '--name-only', base], {
  encoding: 'utf8',
})
  .trim()
  .split('\n');
files.push('e2e/label-in-name.spec.ts');
const syntax = [...new Set(files)]
  .filter((path) => /\.tsx?$/.test(path))
  .map((path) => {
    const diagnostics = parse(path, read(path)).parseDiagnostics;
    assert.equal(
      diagnostics.length,
      0,
      `${path}: ${diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n')}`,
    );
    return {
      path,
      sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
    };
  });
console.log(
  JSON.stringify(
    {
      scope:
        'Source expressions, original translators, syntax and lockfile only; NOT a DOM, typecheck, axe or browser result',
      runtime: process.version,
      typescript: ts.version,
      base,
      cases,
      syntax,
      unchangedWP02: reference,
      unrelatedLockEntriesUnchanged: true,
    },
    null,
    2,
  ),
);
