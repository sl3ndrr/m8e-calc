/** WAAPI throws on unsupported linear(), while CSS declarations silently fall back. */
export function supportedEasing(
  easing: string,
  supports: (property: string, value: string) => boolean = (property, value) =>
    typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports(property, value),
): string {
  return supports('animation-timing-function', easing) ? easing : 'ease-out';
}
