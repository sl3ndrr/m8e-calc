// Supplemental source-level reproduction when lockfile installation is blocked.
// This small set/persistence model is NOT Zustand, React or a production browser.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = 'ecdf8509d1261ba4d349121eba633b6f749564dc';
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.'))
        throw error;
      return next(`${specifier}.ts`, context);
    }
  },
});
const { defaultSettings, normalizeSettings } =
  await import('../src/shared/settings.ts');
const { importSettings, exportSettings } =
  await import('../src/app/fileTransfer.ts');
const read = (path) => readFileSync(`${root}${path}`, 'utf8');
const original = (path) =>
  execFileSync('git', ['show', `${base}:${path}`], {
    cwd: root,
    encoding: 'utf8',
  });
const paths = [
  'src/app/SettingsDialog.tsx',
  'src/shared/settingsStore.ts',
  'src/app/fileTransfer.ts',
];
const sourceHashes = Object.fromEntries(
  paths.map((path) => [
    path,
    createHash('sha256').update(read(path)).digest('hex'),
  ]),
);

function modelStore(source) {
  const start = source.indexOf('(set) => ({');
  const end = source.indexOf('\n      {\n        name:', start);
  assert(start >= 0 && end > start);
  const initialize = new Function(
    'defaultSettings',
    'normalizeSettings',
    'reducedMotion',
    `return ${source.slice(start, end).trim().replace(/,$/, '')};`,
  )(defaultSettings, normalizeSettings, false);
  let state;
  let persisted;
  let writes = 0;
  state = initialize((patch) => {
    state = {
      ...state,
      ...(typeof patch === 'function' ? patch(state) : patch),
    };
    persisted = JSON.stringify(normalizeSettings(state));
    writes++;
  });
  return { get: () => state, persisted: () => persisted, writes: () => writes };
}
function handler(source, snapshot, notices) {
  const start = source.indexOf('async function importFile(');
  const end = source.indexOf('\n  return (', start);
  assert(start >= 0 && end > start);
  return new Function(
    'settings',
    'importSettings',
    'snackbarQueue',
    't',
    `${stripTypeScriptTypes(source.slice(start, end))}; return importFile;`,
  )(
    snapshot,
    importSettings,
    { add: (notice) => notices.push(notice) },
    (key) => key,
  );
}
const results = [];
for (const variant of ['original', 'fixed']) {
  const getSource = variant === 'original' ? original : read;
  for (const initial of [true, false])
    for (const current of [true, false])
      for (const inFile of [true, false]) {
        const store = modelStore(getSource(paths[1]));
        store.get().updateSettings({ onlineRates: initial });
        const notices = [];
        const run = handler(getSource(paths[0]), store.get(), notices);
        const gate = Promise.withResolvers();
        const file = new File(['pending'], 'settings.json');
        let reads = 0;
        Object.defineProperty(file, 'text', {
          value: () => {
            reads++;
            return gate.promise;
          },
        });
        const importing = run(file);
        assert.equal(reads, 1);
        assert.deepEqual(notices, []);
        store.get().updateSettings({ onlineRates: current });
        const before = store.writes();
        gate.resolve(
          exportSettings({
            ...defaultSettings(),
            historyLimit: 17,
            grouping: false,
            onlineRates: inFile,
          }),
        );
        await importing;
        const expectedConsent = variant === 'original' ? initial : current;
        const expected = {
          ...defaultSettings(),
          historyLimit: 17,
          grouping: false,
          onlineRates: expectedConsent,
        };
        assert.deepEqual(normalizeSettings(store.get()), expected);
        assert.deepEqual(JSON.parse(store.persisted()), expected);
        assert.equal(store.writes() - before, 1);
        assert.deepEqual(notices, [{ message: 'settings.imported' }]);
        results.push({
          variant,
          initial,
          current,
          inFile,
          completedConsent: store.get().onlineRates,
          writesAtCompletion: store.writes() - before,
        });
      }
}
const failures = [];
for (const variant of ['original', 'fixed']) {
  const getSource = variant === 'original' ? original : read;
  const store = modelStore(getSource(paths[1]));
  store.get().updateSettings({ onlineRates: true });
  const gate = Promise.withResolvers();
  const file = new File(['pending'], 'settings.json');
  Object.defineProperty(file, 'text', { value: () => gate.promise });
  const importing = handler(getSource(paths[0]), store.get(), [])(file);
  gate.resolve(exportSettings({ ...defaultSettings(), grouping: false }));
  await importing;
  assert.equal(store.get().onlineRates, true);
  store.get().updateSettings({ onlineRates: false });
  assert.equal(JSON.parse(store.persisted()).onlineRates, false);
  results.push({
    variant,
    changeAfterImport: true,
    completedConsent: true,
    finalConsent: false,
  });
}
for (const failure of ['invalid', 'unreadable', 'oversize']) {
  const store = modelStore(read(paths[1]));
  store.get().updateSettings({ onlineRates: true });
  const notices = [];
  const run = handler(read(paths[0]), store.get(), notices);
  const gate = Promise.withResolvers();
  const file = new File(['pending'], 'settings.json');
  let reads = 0;
  Object.defineProperty(file, 'text', {
    value: () => {
      reads++;
      return gate.promise;
    },
  });
  if (failure === 'oversize')
    Object.defineProperty(file, 'size', { value: 100001 });
  const importing = run(file);
  store.get().updateSettings({ onlineRates: false });
  const before = store.persisted();
  const writes = store.writes();
  if (failure === 'invalid')
    gate.resolve(
      JSON.stringify({
        version: 4,
        settings: { grouping: false, historyLimit: 1000 },
      }),
    );
  if (failure === 'unreadable') gate.reject(new Error('read failed'));
  await importing;
  assert.equal(store.persisted(), before);
  assert.equal(store.writes(), writes);
  assert.equal(store.get().onlineRates, false);
  assert.equal(reads, failure === 'oversize' ? 0 : 1);
  assert.deepEqual(notices, [{ message: 'settings.invalid' }]);
  failures.push({
    failure,
    reads,
    writesAtCompletion: store.writes() - writes,
  });
}
const evidence = {
  timestamp: new Date().toISOString(),
  node: process.version,
  base,
  sourceHashes,
  limitation:
    'Source handler and initializer executed with a small set/persistence model; no Zustand, React, real reload or browser/network execution.',
  results,
  failures,
};
writeFileSync(
  `${root}docs/wp03-source-evidence.json`,
  `${JSON.stringify(evidence, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    scenarios: results.length,
    failures: failures.length,
    oldConsentRace: 'confirmed at source/model level',
    fixed: 'passed',
    browserRequests: 'not measured',
  }),
);
