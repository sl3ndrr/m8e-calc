import { readFile, readdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const documents = [
  'README.md',
  'CHANGELOG.md',
  'AGENTS.md',
  ...(await readdir('docs'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => `docs/${name}`),
];
const external = new Set();
const failures = [];
for (const file of documents) {
  const text = await readFile(file, 'utf8');
  for (const [, command] of text.matchAll(/npm run ([\w:-]+)/g)) {
    if (!(command in manifest.scripts))
      failures.push(`${file}: unknown npm script ${command}`);
  }
  for (const [, link] of text.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^https?:/.test(link)) {
      external.add(link);
      continue;
    }
    if (link.startsWith('#')) continue;
    try {
      await access(resolve(dirname(file), link.split('#')[0]));
    } catch {
      failures.push(`${file}: missing ${link}`);
    }
  }
}
const checkExternal = process.argv.includes('--external');
for (const url of checkExternal ? [...external].sort() : []) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    console.log(`${response.status} ${url} -> ${response.url}`);
    await response.body?.cancel();
    // These exact catalogue URLs were independently verified on 2026-10-14.
    // Their hosts block the CI client; do not accept other URLs or statuses.
    const reviewedBlock =
      [
        'https://www.iso.org/standard/7472.html',
        'https://www.hhs.gov/guidance/document/guidance-industry-guidelines-determining-metric-equivalents-household-measures',
      ].includes(url) && response.status === 403;
    if (reviewedBlock)
      console.log(
        `REVIEWED: catalogue independently verified; CI bot receives 403: ${url}`,
      );
    if (!response.ok && !reviewedBlock)
      failures.push(`HTTP ${response.status}: ${url}`);
  } catch (error) {
    failures.push(`${url}: ${error.message}`);
  }
}
if (failures.length) throw new Error(failures.join('\n'));
console.log(
  `Checked ${documents.length} documents, npm commands, local links and ${checkExternal ? external.size : 0} external URLs (${external.size} identified).`,
);
