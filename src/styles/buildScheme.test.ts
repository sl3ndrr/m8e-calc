import { describe, expect, it } from 'vitest';
import {
  argbFromHex,
  Contrast,
  lstarFromArgb,
} from '@material/material-color-utilities';
import {
  buildScheme,
  colorRoles,
  contrasts,
  roleProperty,
  schemeVariants,
} from './buildScheme';
const seeds = ['#6750a4', '#008ba9', '#e2675a', '#000000', '#ffffff'];
const pairs = [
  ['onPrimary', 'primary'],
  ['onPrimaryContainer', 'primaryContainer'],
  ['onSecondary', 'secondary'],
  ['onSecondaryContainer', 'secondaryContainer'],
  ['onTertiary', 'tertiary'],
  ['onTertiaryContainer', 'tertiaryContainer'],
  ['onError', 'error'],
  ['onErrorContainer', 'errorContainer'],
  ['onSurface', 'surface'],
  ['onSurfaceVariant', 'surfaceVariant'],
  ['inverseOnSurface', 'inverseSurface'],
  ['inversePrimary', 'inverseSurface'],
  ...['Lowest', 'Low', '', 'High', 'Highest'].map((suffix) => [
    'onSurface',
    `surfaceContainer${suffix}`,
  ]),
  ...['Primary', 'Secondary', 'Tertiary'].flatMap((role) =>
    ['Fixed', 'FixedDim'].flatMap((suffix) => [
      [`on${role}Fixed`, `${role[0]?.toLowerCase()}${role.slice(1)}${suffix}`],
      [
        `on${role}FixedVariant`,
        `${role[0]?.toLowerCase()}${role.slice(1)}${suffix}`,
      ],
    ]),
  ),
];
describe('buildScheme', () => {
  it('provides all 49 roles and WCAG AA text contrast at every supported level', () => {
    for (const seed of seeds)
      for (const variant of schemeVariants)
        for (const dark of [false, true])
          for (const contrast of contrasts) {
            const scheme = buildScheme(seed, variant, dark, contrast);
            expect(Object.keys(scheme)).toHaveLength(colorRoles.length + 4);
            for (const [on, background] of pairs) {
              const fg = scheme[roleProperty(on ?? '')];
              const bg = scheme[roleProperty(background ?? '')];
              if (!fg || !bg) throw Error('Missing role');
              const ratio = Contrast.ratioOfTones(
                lstarFromArgb(argbFromHex(fg)),
                lstarFromArgb(argbFromHex(bg)),
              );
              expect(
                ratio,
                `${seed}/${variant}/${dark}/${contrast}: ${on}/${background}`,
              ).toBeGreaterThanOrEqual(4.5);
            }
          }
  });
  it('is deterministic and validates seed input', () => {
    expect(buildScheme('#6750A4')).toEqual(buildScheme('#6750a4'));
    for (const invalid of ['red', '#fff', '#gggggg', '', '#6750a4;'])
      expect(() => buildScheme(invalid)).toThrow(TypeError);
  });
});

