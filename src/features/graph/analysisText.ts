import type { ExactNumber, ExactStep, Rational } from '../../graph';
import type { Locale, NumberPreferences } from '../../shared/i18n';
import { t } from '../../shared/i18n/extended';
import { formatGraphNumber, graphNumberLocale } from './numbers';
import type { AnalysisMarker } from './analysisAdapter';

const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const superscript = (n: number) =>
  String(n).replace(/\d/g, (d) => superscripts[Number(d)] ?? d);
const derivativeSymbols = ['f', 'f′', 'f″', 'f‴'];
const derivative = (n: number) =>
  derivativeSymbols[n] ?? `f⁽${superscript(n)}⁾`;

export function analysisText(
  marker: AnalysisMarker,
  locale: Locale,
  preferences: NumberPreferences,
): { label: string; coordinates: string; steps?: readonly string[] } {
  const label = marker.exact?.classification
    ? t(`graph.analysis.${marker.exact.classification}`, locale)
    : t(`graph.analysis.${marker.label}`, locale);
  const approximate = (value: number) =>
    formatGraphNumber(value, locale, preferences);
  if (!marker.exact) {
    const coordinates = `(${approximate(marker.x)}, ${approximate(marker.y)})`;
    return {
      label,
      coordinates:
        marker.label === 'tangent' && marker.confidence
          ? coordinates
          : `≈ ${coordinates}`,
    };
  }
  const approximatePoint = `(${approximate(marker.x)} | ${approximate(marker.y)})`;

  const formatter = new Intl.NumberFormat(
    graphNumberLocale(locale, preferences),
    {
      useGrouping: preferences.grouping,
    },
  );
  const integer = (n: bigint) =>
    n < 0n ? '−' + formatter.format(-n) : formatter.format(n);
  function fraction({ numerator, denominator }: Rational, term = ''): string {
    const prefix =
      term && (numerator === 1n || numerator === -1n)
        ? numerator < 0n
          ? '−'
          : ''
        : integer(numerator);
    return (
      prefix + term + (denominator === 1n ? '' : '/' + integer(denominator))
    );
  }
  const joinTerms = (left: string, right: string) =>
    !left
      ? right
      : right.startsWith('−')
        ? left + ' − ' + right.slice(1)
        : left + ' + ' + right;
  function number(value: ExactNumber): string {
    const base = fraction(value.rational);
    if (!value.radicand) return base;
    return joinTerms(
      value.rational.numerator ? base : '',
      fraction(value.radical, '√' + integer(value.radicand)),
    );
  }
  function polynomial(coefficients: readonly Rational[]): string {
    let text = '';
    for (let i = coefficients.length - 1; i >= 0; i--) {
      const c = coefficients[i];
      if (c?.numerator)
        text = joinTerms(
          text,
          fraction(c, i > 1 ? 'x' + superscript(i) : i === 1 ? 'x' : ''),
        );
    }
    return text || '0';
  }
  function formatStep(step: ExactStep): string {
    switch (step.kind) {
      case 'compare':
        return `f(x) = g(x) ⇒ ${polynomial(step.f)} = ${polynomial(step.g)}`;
      case 'derivative':
        return `${derivative(step.order)}(x) = ${polynomial(step.expression)}`;
      case 'equation':
        return `${polynomial(step.expression)} = 0`;
      case 'factors':
        return `${step.factors.map((p) => '(' + polynomial(p) + ')').join(' · ')} = 0 ⇒ ${polynomial(step.selected)} = 0`;
      case 'linear':
        return `${fraction(step.coefficient, 'x')} = ${fraction(step.right)}`;
      case 'square':
        return `x² = ${fraction(step.right)}`;
      case 'quadratic': {
        const coefficients = [step.c, step.b, step.a].map((numerator) => ({
          numerator,
          denominator: 1n,
        }));
        const discriminant = integer(step.discriminant);
        return `${polynomial(coefficients)} = 0 ⇒ Δ = b² − 4ac = ${discriminant} ⇒ x = (−b ± √Δ)/(2a)`;
      }
      case 'solution':
        return `x = ${number(step.x)}`;
      case 'substitute':
        return `y = f(${number(step.x)}) = ${number(step.y)}`;
      case 'classify': {
        const x = number(step.x);
        const signs = step.rightSign > 0 ? '− → +' : '+ → −';
        const zeros = Array.from(
          { length: step.order - step.derivative - 1 },
          (_, i) => `${derivative(step.derivative + i + 1)}(${x})`,
        );
        const vanishing = zeros.length ? `${zeros.join(' = ')} = 0 ⇒ ` : '';
        const stationary =
          step.classification === 'stationaryInflection'
            ? `f′(${x}) = 0, `
            : '';
        return `${stationary}${vanishing}${derivative(step.order)}(${x}) = ${number(step.value)} ⇒ ${derivative(step.derivative)}: ${signs} ⇒ ${t(`graph.analysis.${step.classification}`, locale)}`;
      }
    }
  }
  const { x, y, steps } = marker.exact;
  const needsApproximation = (n: ExactNumber) =>
    n.radicand !== 0n || n.rational.denominator !== 1n;
  const root = marker.label === 'roots';
  const exactCoordinates = root
    ? `x = ${number(x)}`
    : `(${number(x)} | ${number(y)})`;
  const approximation =
    needsApproximation(x) || needsApproximation(y)
      ? ` ≈ ${root ? approximate(marker.x) : approximatePoint}`
      : '';
  return {
    label,
    coordinates: exactCoordinates + approximation,
    steps: steps
      .map(formatStep)
      .filter((step, index, all) => step !== all[index - 1]),
  };
}
