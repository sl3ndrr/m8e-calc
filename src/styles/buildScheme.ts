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

export const schemeVariants = [
  'tonalSpot',
  'expressive',
  'vibrant',
  'neutral',
] as const;
export type SchemeVariant = (typeof schemeVariants)[number];
export const contrasts = ['standard', 'medium', 'high'] as const;
export type ContrastLevel = (typeof contrasts)[number];
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
  return Object.fromEntries(
    colorRoles.map((role) => [
      roleProperty(role),
      hexFromArgb(MaterialDynamicColors[role].getArgb(scheme)),
    ]),
  );
}
