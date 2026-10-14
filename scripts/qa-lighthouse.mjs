import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const directory = 'test-results/lighthouse';
const reports = readdirSync(directory)
  .filter((name) => name.endsWith('.report.json'))
  .map((name) => JSON.parse(readFileSync(`${directory}/${name}`, 'utf8')));
const median = (values) =>
  values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)];
const modes = ['simple', 'scientific', 'convert', 'graph'].map((mode) => {
  const runs = reports.filter(
    (report) => new URL(report.requestedUrl).hash === `#/${mode}`,
  );
  if (runs.length !== 3)
    throw Error(
      `Expected three Lighthouse runs for ${mode}, got ${runs.length}`,
    );
  const scores = Object.fromEntries(
    ['performance', 'accessibility', 'best-practices'].map((category) => [
      category,
      {
        median: median(runs.map((run) => run.categories[category].score)),
        min: Math.min(...runs.map((run) => run.categories[category].score)),
      },
    ]),
  );
  return {
    mode,
    runs: runs.length,
    scores,
    clsMax: Math.max(
      ...runs.map((run) => run.audits['cumulative-layout-shift'].numericValue),
    ),
  };
});
mkdirSync('test-results/qa', { recursive: true });
writeFileSync(
  'test-results/qa/lighthouse.json',
  JSON.stringify(modes, null, 2),
);
console.log(JSON.stringify(modes));
// LHCI groups hash routes under one URL; assert each mode independently as well.
if (
  !process.env.QA_BASELINE &&
  modes.some(
    (mode) =>
      mode.clsMax !== 0 ||
      Object.values(mode.scores).some((score) => score.median < 0.95),
  )
)
  process.exitCode = 1;
