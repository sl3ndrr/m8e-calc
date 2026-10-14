import { mkdirSync, writeFileSync } from 'node:fs';
import {
  buildScheme,
  schemeVariants,
  contrasts,
  roleProperty,
} from '../src/styles/buildScheme.ts';
import { graphContrast } from '../src/styles/graphPalette.ts';
import { seeds } from '../src/styles/seeds.ts';
const surfaces = [
  'surface',
  'surfaceDim',
  'surfaceBright',
  'surfaceVariant',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
];
export const textPairs = [
  ['onBackground', 'background'],
  ['inverseOnSurface', 'inverseSurface'],
  ['inversePrimary', 'inverseSurface'],
  ...surfaces.flatMap((bg) =>
    [
      'onSurface',
      'onSurfaceVariant',
      'primary',
      'secondary',
      'tertiary',
      'error',
    ].map((fg) => [fg, bg]),
  ),
  ...['Primary', 'Secondary', 'Tertiary', 'Error'].flatMap((f) => [
    [`on${f}`, f[0].toLowerCase() + f.slice(1)],
    [`on${f}Container`, f[0].toLowerCase() + f.slice(1) + 'Container'],
  ]),
  ...['Primary', 'Secondary', 'Tertiary'].flatMap((f) =>
    ['Fixed', 'FixedDim'].flatMap((s) =>
      [`on${f}Fixed`, `on${f}FixedVariant`].map((on) => [
        on,
        f[0].toLowerCase() + f.slice(1) + s,
      ]),
    ),
  ),
];
export function auditContrast() {
  const failures = [];
  let checks = 0,
    minText = Infinity,
    minUI = Infinity;
  for (const [name, seed] of seeds)
    for (const variant of schemeVariants)
      for (const contrast of contrasts)
        for (const dark of [false, true]) {
          const scheme = buildScheme(seed, variant, dark, contrast);
          const pairs = [
            ...textPairs.map(([fg, bg]) => [fg, bg, 4.5]),
            ...surfaces.flatMap((bg) =>
              ['primary', 'outline'].map((fg) => [fg, bg, 3]),
            ),
          ];
          for (const [fg, bg, target] of pairs) {
            const a = scheme[roleProperty(fg)];
            const b = scheme[roleProperty(bg)];
            const ratio = graphContrast(a, b);
            checks++;
            if (target === 4.5) minText = Math.min(minText, ratio);
            else minUI = Math.min(minUI, ratio);
            if (!(ratio >= target))
              failures.push({
                name,
                variant,
                contrast,
                dark,
                fg,
                bg,
                ratio,
                target,
              });
          }
        }
  return {
    schemes: seeds.length * schemeVariants.length * contrasts.length * 2,
    checks,
    minText,
    minUI,
    failures,
  };
}
const result = auditContrast();
mkdirSync('test-results/qa', { recursive: true });
writeFileSync('test-results/qa/contrast.json', JSON.stringify(result, null, 2));
console.log(
  JSON.stringify({ ...result, failures: result.failures.slice(0, 12) }),
);
if (result.failures.length && !process.env.QA_BASELINE) process.exitCode = 1;
