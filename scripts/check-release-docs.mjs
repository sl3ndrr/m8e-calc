import { readFile, readdir, access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Existing decisions from 2026-10-14; exact URLs and status only, no host rules.
// Evidence: docs/RELEASE.md and docs/UNITS.md. A redirect is not covered.
export const manualReviews = [
  {
    url: 'https://www.iso.org/standard/7472.html',
    status: 403,
    reviewedOn: '2026-10-14',
    evidence: 'ISO 2533:1975 catalogue: standard atmosphere; docs/UNITS.md',
  },
  {
    url: 'https://www.hhs.gov/guidance/document/guidance-industry-guidelines-determining-metric-equivalents-household-measures',
    status: 403,
    reviewedOn: '2026-10-14',
    evidence:
      'Official HHS/FDA guidance catalogue: metric household measures; docs/UNITS.md',
  },
];

export async function checkExternalUrl(
  url,
  { reviews = manualReviews, timeoutMs = 30000 } = {},
) {
  const result = {
    kind: 'external',
    originalUrl: url,
    finalUrl: null,
    status: null,
    attempt: 1,
    category: null,
    reason: null,
    errorCode: null,
    httpPassed: false,
    accepted: false,
    manualReview: null,
  };
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    result.finalUrl = response.url;
    result.status = response.status;
    await response.body?.cancel();
    const review = reviews.find(
      (entry) =>
        entry.url === url &&
        entry.status === response.status &&
        !response.redirected &&
        response.url === url,
    );
    if (response.ok) {
      result.category = 'http-success';
      result.httpPassed = true;
      result.accepted = true;
    } else if (review) {
      result.category = 'manually-reviewed-client-block';
      result.reason = `HTTP ${response.status}; manually reviewed, HTTP test did not pass`;
      result.manualReview = review;
      result.accepted = true;
    } else {
      result.category =
        response.status === 429 || response.status >= 500
          ? 'http-transient-error'
          : 'http-error';
      result.reason = `HTTP ${response.status} ${response.statusText}`.trim();
    }
  } catch (error) {
    result.category =
      error.name === 'TimeoutError' ? 'timeout' : 'transport-error';
    result.errorCode = error.cause?.code ?? error.code ?? error.name;
    result.reason = [error.message, error.cause?.message]
      .filter(Boolean)
      .join(': ');
  }
  return result;
}

export async function checkDocuments({
  root = '.',
  external = false,
  ...options
} = {}) {
  const manifest = JSON.parse(
    await readFile(resolve(root, 'package.json'), 'utf8'),
  );
  const documents = [
    'README.md',
    'CHANGELOG.md',
    'AGENTS.md',
    ...(await readdir(resolve(root, 'docs')))
      .filter((name) => name.endsWith('.md'))
      .sort()
      .map((name) => `docs/${name}`),
  ];
  const urls = new Map();
  const results = [];
  let localLinks = 0;
  let npmCommands = 0;
  for (const file of documents) {
    const text = await readFile(resolve(root, file), 'utf8');
    for (const [, command] of text.matchAll(/npm run ([\w:-]+)/g)) {
      npmCommands++;
      if (!Object.hasOwn(manifest.scripts, command))
        results.push({
          kind: 'npm-command',
          category: 'unknown-npm-command',
          file,
          command,
          accepted: false,
          reason: `unknown npm script ${command}`,
        });
    }
    for (const [, link] of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^https?:/.test(link)) {
        if (!urls.has(link)) urls.set(link, new Set());
        urls.get(link).add(file);
        continue;
      }
      if (link.startsWith('#')) continue;
      localLinks++;
      try {
        await access(resolve(root, dirname(file), link.split('#')[0]));
      } catch (error) {
        results.push({
          kind: 'local-link',
          category: 'local-link-error',
          file,
          link,
          accepted: false,
          errorCode: error.code,
          reason: `missing or inaccessible ${link}: ${error.message}`,
        });
      }
    }
  }
  for (const url of external ? [...urls.keys()].sort() : []) {
    results.push({
      ...(await checkExternalUrl(url, options)),
      documents: [...urls.get(url)],
    });
  }
  return {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    externalEnabled: external,
    policy: { attemptsPerUrl: 1, timeoutMs: options.timeoutMs ?? 30000 },
    summary: {
      documents: documents.length,
      localLinks,
      npmCommands,
      externalIdentified: urls.size,
      externalChecked: external ? urls.size : 0,
      httpPassed: results.filter((r) => r.httpPassed).length,
      manuallyReviewed: results.filter((r) => r.manualReview).length,
      failures: results.filter((r) => !r.accepted).length,
    },
    results,
  };
}

export async function runCli(args = process.argv.slice(2)) {
  const reportIndex = args.indexOf('--report');
  if (
    reportIndex !== -1 &&
    (!args[reportIndex + 1] || args[reportIndex + 1].startsWith('--'))
  )
    throw new Error('--report requires a file path');
  const reportPath =
    reportIndex === -1
      ? 'test-results/release-docs.json'
      : args[reportIndex + 1];
  const report = await checkDocuments({
    external: args.includes('--external'),
  });
  await mkdir(dirname(resolve(reportPath)), { recursive: true });
  // Write before deciding the exit status: failures must leave the same evidence.
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  for (const result of report.results) {
    if (!result.accepted || result.manualReview)
      console.log(
        `${result.category}: ${result.file ?? result.originalUrl}: ${result.reason}`,
      );
  }
  const s = report.summary;
  console.log(
    `Checked ${s.documents} documents, ${s.localLinks} local links, ${s.npmCommands} npm commands; ${s.httpPassed} HTTP passed, ${s.manuallyReviewed} manually reviewed, ${s.failures} failures (${s.externalChecked}/${s.externalIdentified} external URLs). Report: ${reportPath}`,
  );
  return s.failures ? 1 : 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  process.exitCode = await runCli();
