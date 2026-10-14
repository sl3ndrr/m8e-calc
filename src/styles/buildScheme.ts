import {
  argbFromHex,
  hexFromArgb,
  Hct,
  MaterialDynamicColors,
  SchemeTonalSpot,
  SchemeExpressive,
  SchemeVibrant,
  SchemeNeutral,
} from '@material/material-color-utilities';

import { graphContrast } from './graphPalette.ts';
export {
  schemeVariants,
  contrasts,
  type SchemeVariant,
  type ContrastLevel,
} from './colorSettings.ts';
import type { SchemeVariant, ContrastLevel } from './colorSettings.ts';
export const colorRoles = [
  'background',
  'onBackground',
  'surface',
  'surfaceDim',
  'surfaceBright',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'onSurface',
  'surfaceVariant',
  'onSurfaceVariant',
  'inverseSurface',
  'inverseOnSurface',
  'outline',
  'outlineVariant',
  'shadow',
  'scrim',
  'surfaceTint',
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'inversePrimary',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
  'primaryFixed',
  'primaryFixedDim',
  'onPrimaryFixed',
  'onPrimaryFixedVariant',
  'secondaryFixed',
  'secondaryFixedDim',
  'onSecondaryFixed',
  'onSecondaryFixedVariant',
  'tertiaryFixed',
  'tertiaryFixedDim',
  'onTertiaryFixed',
  'onTertiaryFixedVariant',
] as const;
export type ColorRole = (typeof colorRoles)[number];
export type ColorScheme = Record<`--md-sys-color-${string}`, string>;
export const roleProperty = (role: string): `--md-sys-color-${string}` =>
  `--md-sys-color-${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

/** Pure, complete M3 dynamic scheme; contrast levels map to 0 / 0.5 / 1. */
export function buildScheme(
  seedHex: string,
  variant: SchemeVariant = 'tonalSpot',
  isDark = false,
  contrast: ContrastLevel = 'standard',
): ColorScheme {
  if (!/^#[\da-f]{6}$/i.test(seedHex))
    throw new TypeError('Expected a six-digit hex seed');
  const constructors = {
    tonalSpot: SchemeTonalSpot,
    expressive: SchemeExpressive,
    vibrant: SchemeVibrant,
    neutral: SchemeNeutral,
  };
  const scheme = new constructors[variant](
    Hct.fromInt(argbFromHex(seedHex)),
    isDark,
    { standard: 0, medium: 0.5, high: 1 }[contrast],
  );
  const result: ColorScheme = Object.fromEntries(
    colorRoles.map((role) => [
      roleProperty(role),
      hexFromArgb(MaterialDynamicColors[role].getArgb(scheme)),
    ]),
  );
  const backgrounds = [
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
  const outline = Hct.fromInt(
    argbFromHex(result[roleProperty('outline')] ?? seedHex),
  );
  let tone = outline.tone;
  let color = hexFromArgb(outline.toInt());
  for (
    let i = 0;
    i < 100 &&
    backgrounds.some(
      (bg) => graphContrast(color, result[roleProperty(bg)] ?? '') < 3,
    );
    i++
  ) {
    tone = Math.max(0, Math.min(100, tone + (isDark ? 1 : -1)));
    color = hexFromArgb(Hct.from(outline.hue, outline.chroma, tone).toInt());
  }
  result[roleProperty('outline')] = color;
  return result;
}
