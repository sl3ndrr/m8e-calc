export const schemeVariants = [
  'tonalSpot',
  'expressive',
  'vibrant',
  'neutral',
] as const;
export type SchemeVariant = (typeof schemeVariants)[number];
export const contrasts = ['standard', 'medium', 'high'] as const;
export type ContrastLevel = (typeof contrasts)[number];
