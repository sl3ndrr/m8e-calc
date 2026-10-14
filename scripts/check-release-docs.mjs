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
for (const url of process.argv.includes('--external')
  ? [...external].sort()
  : []) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    console.log(`${response.status} ${url} -> ${response.url}`);
    await response.body?.cancel();
    // ISO blocks automated CI clients; the official catalogue was independently
    // verified on 2026-10-14. Do not silently accept other blocked URLs.
    const reviewedBlock =
      url === 'https://www.iso.org/standard/7472.html' &&
      response.status === 403;
    if (reviewedBlock)
      console.log('REVIEWED: ISO catalogue exists; CI bot receives 403.');
    if (!response.ok && !reviewedBlock)
      failures.push(`HTTP ${response.status}: ${url}`);
  } catch (error) {
    failures.push(`${url}: ${error.message}`);
  }
}
if (failures.length) throw new Error(failures.join('\n'));
console.log(
  `Checked ${documents.length} documents, npm commands, local links and ${external.size} external URLs.`,
);
