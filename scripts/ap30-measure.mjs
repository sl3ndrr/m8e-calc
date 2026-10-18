import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const output = process.argv[2] ?? 'test-results/ap30/after';
mkdirSync(output, { recursive: true });
// Reuse AP23's exact entry + SimpleMode static closure and artifact accounting.
execFileSync(
  process.execPath,
  ['scripts/ap23-measure.mjs', 'dist', `${output}/sizes.json`],
  { stdio: 'inherit' },
);
execFileSync(process.execPath, ['scripts/qa-bundle.mjs'], { stdio: 'inherit' });
const sizes = JSON.parse(readFileSync(`${output}/sizes.json`));
const graph = JSON.parse(readFileSync('test-results/ap23/modules-normal.json'));
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json'));
const sw = readFileSync('dist/sw.js', 'utf8');
const urls = JSON.parse(sw.match(/const URLS = (\[.*\]);/)[1]);
const base = '/m8e-calc/';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const precache = urls.map((url) => {
  if (!url.startsWith(base)) throw Error(`Nonlocal precache URL: ${url}`);
  const bytes = readFileSync('dist/' + url.slice(base.length));
  return {
    url,
    raw: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    sha256: hash(bytes),
  };
});
const initial = graph.filter((chunk) =>
  sizes.initialChunks.includes(chunk.file),
);
for (const chunk of graph)
  if (!urls.includes(base + chunk.file))
    throw Error(`Emitted chunk missing from precache: ${chunk.file}`);
const evidence = {
  sha: process.env.AP30_SOURCE,
  node: process.version,
  zlib: process.versions.zlib,
  lockSha256: hash(readFileSync('package-lock.json')),
  measurementSha256: hash(readFileSync('scripts/qa-bundle.mjs')),
  reportSha256: hash(readFileSync('scripts/ap30-measure.mjs')),
  ...sizes,
  initialGraph: initial.map((chunk) => ({
    ...chunk,
    ...sizes.files.find((file) => file.file === chunk.file),
  })),
  graph,
  manifest,
  precache,
  offlinePrecache: precache.reduce(
    (sum, file) => ({ raw: sum.raw + file.raw, gzip: sum.gzip + file.gzip }),
    { raw: 0, gzip: 0 },
  ),
};
writeFileSync(`${output}/evidence.json`, JSON.stringify(evidence, null, 2));
copyFileSync('dist/sw.js', `${output}/sw.js`);
console.log(
  JSON.stringify({
    sha: evidence.sha,
    node: evidence.node,
    zlib: evidence.zlib,
    initial: evidence.initialJavaScript,
    artifact: evidence.artifact,
    precache: evidence.offlinePrecache,
    initialChunks: evidence.initialGraph.map(({ file, gzip, modules }) => ({
      file,
      gzip,
      modules: modules.length,
    })),
  }),
);
