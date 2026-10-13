import type { EvaluationContext } from './types.ts';

export interface ValueCase {
  readonly src: string;
  readonly expected: string;
  readonly ctx?: EvaluationContext;
}

// Independent examples of the language contract, shared with the native benchmark.
export const arithmeticCases: readonly ValueCase[] = [
  ['12', '12'], ['0.5', '0.5'], ['.5', '0.5'], ['12.', '12'],
  ['1e-3', '0.001'], ['2E5', '200000'], ['1E+3', '1000'],
  ['0.1+0.2', '0.3'], ['0.3-0.2', '0.1'], ['0.1*0.2', '0.02'],
  ['0.3/0.1', '3'], ['1/8', '0.125'], ['1e-20+2e-20', '3e-20'],
  ['2+3*4', '14'], ['(2+3)*4', '20'], ['12/3*2', '8'],
  ['12/(3*2)', '2'], ['10-3-2', '5'], ['8/4/2', '1'],
  ['2^3^2', '512'], ['(2^3)^2', '64'], ['2^(3^2)', '512'],
  ['-2^2', '-4'], ['(-2)^2', '4'], ['2^-3', '0.125'],
  ['-2^-2', '-0.25'], ['2^+3', '8'], ['2^--3', '8'],
  ['2^-2^2', '0.0625'], ['(-2)^3', '-8'], ['-(-2)^2', '-4'],
  ['-3!', '-6'], ['(-3)^2', '9'], ['2^3!', '64'], ['3!^2', '36'],
  ['0!', '1'], ['1!', '1'], ['5!', '120'], ['3!!', '720'],
  ['2+3!^2', '38'], ['+2', '2'], ['--2', '2'], ['+-2', '-2'],
  ['1+-2', '-1'], ['1--2', '3'], ['4*-2', '-8'], ['4/-2', '-2'],
  ['2×3', '6'], ['8÷2', '4'], ['2·3', '6'], ['5−3', '2'],
  ['−2^2', '-4'], ['2(3+4)', '14'], ['(1+2)(3+4)', '21'],
  ['3sqrt(4)', '6'], ['2sqrt(4)^2', '8'], ['(2)3', '6'],
  ['3!2', '12'], ['50%2', '1'], ['2(3)4', '24'],
  ['4/2(1+1)', '4'], ['4/(2(1+1))', '1'], ['2(3+4)^2', '98'],
  ['2^3(4)', '32'], ['2(-3)', '-6'], ['(2)(-3)', '-6'],
  ['sqrt(4)(3)', '6'], ['(1+1)!', '2'], ['2^(-3)', '0.125'],
  ['sqrt(9)+cbrt(8)', '5'], ['root(3,-8)', '-2'], ['root(-3,-8)', '-0.5'],
  ['root(2,9)', '3'], ['root(-2,4)', '0.5'], ['root(1,-7)', '-7'],
  ['abs(-2.5)', '2.5'], ['exp(0)', '1'], ['ln(1)', '0'],
  ['log(1000)', '3'], ['log2(1024)', '10'], ['logb(3,81)', '4'],
  ['logb(0.5,8)', '-3'], ['floor(-2.1)', '-3'], ['ceil(-2.1)', '-2'],
  ['round(2.5)', '3'], ['round(-2.5)', '-3'], ['round(-2.49)', '-2'],
  ['trunc(-2.9)', '-2'], ['sign(-2)', '-1'], ['sign(0)', '0'],
  ['sign(2)', '1'], ['min(4,2,-1,3)', '-1'], ['max(4,2,-1,3)', '4'],
  ['min(7)', '7'], ['max(-7)', '-7'], ['mod(-5,3)', '1'],
  ['mod(5,-3)', '2'], ['mod(-5,-3)', '1'], ['mod(5.5,2)', '1.5'],
  ['mod(-5.5,2)', '0.5'], ['0^3', '0'], ['(-0)^2', '0'],
].map(([src = '', expected = '']) => ({ src, expected }));

export const percentCases: readonly ValueCase[] = [
  ['50%', '0.5', '0.5'], ['50%%', '0.005', '0.005'],
  ['200+10%', '200.1', '220'], ['200-10%', '199.9', '180'],
  ['200*10%', '20', '20'], ['200/10%', '2000', '2000'],
  ['200+(10%)', '200.1', '220'], ['200+(-10%)', '199.9', '180'],
  ['200+-10%', '199.9', '180'], ['200--10%', '200.1', '220'],
  ['200+10%*2', '200.2', '200.2'], ['200+(10+5)%', '200.15', '230'],
  ['200+10%+10%', '200.2', '242'], ['200-10%-10%', '199.8', '162'],
  ['(100+100)+10%', '200.1', '220'], ['200+10%%', '200.001', '200.2'],
  ['200+10%^2', '200.01', '200.01'], ['200+abs(10%)', '200.1', '200.1'],
  ['100%+10%', '1.1', '1.1'], ['100%*10%', '0.1', '0.1'],
  ['-200+10%', '-199.9', '-220'], ['0+10%', '0.1', '0'],
  ['2^50%', '1.4142135623730950488016887242096980785696718753769', '1.4142135623730950488016887242096980785696718753769'],
  ['(2^2)%', '0.04', '0.04'], ['5!%', '1.2', '1.2'],
].flatMap(([src = '', strict = '', calculator = '']) => [
  { src, expected: strict, ctx: { percentMode: 'strict' } },
  { src, expected: calculator, ctx: { percentMode: 'calculator' } },
]);

// Rational special values in all three angle modes, including negative/full turns.
export const angleCases: readonly ValueCase[] = [
  [0, '0', '1', '0'], [30, '0.5', null, null], [60, null, '0.5', null],
  [90, '1', '0', null], [120, null, '-0.5', null], [150, '0.5', null, null],
  [180, '0', '-1', '0'], [210, '-0.5', null, null], [240, null, '-0.5', null],
  [270, '-1', '0', null], [300, null, '0.5', null], [330, '-0.5', null, null],
  [360, '0', '1', '0'], [45, null, null, '1'], [135, null, null, '-1'],
  [225, null, null, '1'], [315, null, null, '-1'], [-45, null, null, '-1'],
  [-90, '-1', '0', null], [-180, '0', '-1', '0'], [-360, '0', '1', '0'],
  [390, '0.5', null, null], [540, '0', '-1', '0'], [720, '0', '1', '0'],
  [1080, '0', '1', '0'], [1000000080, null, null, null],
].flatMap(([degree, sin, cos, tan]) => {
  const d = Number(degree);
  return (['deg', 'rad', 'grad'] as const).flatMap((angleMode) => {
    const argument = angleMode === 'deg' ? String(d)
      : angleMode === 'rad' ? `(${d}*pi/180)` : `(${d}*10/9)`;
    return [['sin', sin], ['cos', cos], ['tan', tan]].flatMap(([fn, expected]) =>
      typeof expected === 'string'
        ? [{ src: `${fn}(${argument})`, expected, ctx: { angleMode } }]
        : [],
    );
  });
});

export const inverseCases: readonly ValueCase[] = [
  ['asin(0.5)', '30'], ['acos(0.5)', '60'], ['atan(1)', '45'],
  ['atan(-1)', '-45'], ['asin(1)', '90'], ['acos(-1)', '180'],
  ['atan2(1,1)', '45'], ['atan2(1,-1)', '135'], ['atan2(-1,-1)', '-135'],
  ['atan2(-1,1)', '-45'], ['atan2(0,-1)', '180'], ['atan2(1,0)', '90'],
].map(([src = '', expected = '']) => ({ src, expected, ctx: { angleMode: 'deg' } }));

export interface ErrorCase {
  readonly src: string;
  readonly code: string;
  readonly start: number;
  readonly end: number;
  readonly ctx?: EvaluationContext;
}

export const errorCases: readonly ErrorCase[] = [
  ['', 'E_SYNTAX', 0, 0], ['  ', 'E_SYNTAX', 2, 2],
  ['1+', 'E_UNEXPECTED_TOKEN', 2, 2], ['*2', 'E_UNEXPECTED_TOKEN', 0, 1],
  ['1 2', 'E_UNEXPECTED_TOKEN', 2, 3], ['1.2.3', 'E_UNEXPECTED_TOKEN', 3, 5],
  ['.', 'E_UNEXPECTED_TOKEN', 0, 1], ['1,2', 'E_UNEXPECTED_TOKEN', 1, 2],
  ['1e', 'E_INVALID_NUMBER', 0, 2], ['1e+', 'E_INVALID_NUMBER', 0, 3],
  ['1E-', 'E_INVALID_NUMBER', 0, 3], ['(1', 'E_MISSING_PAREN', 2, 2],
  ['sin(1', 'E_MISSING_PAREN', 5, 5], ['1)', 'E_UNEXPECTED_PAREN', 1, 2],
  ['()', 'E_UNEXPECTED_TOKEN', 1, 2], ['min(1,)', 'E_UNEXPECTED_TOKEN', 6, 7],
  ['min(,1)', 'E_UNEXPECTED_TOKEN', 4, 5], ['min(1 2)', 'E_MISSING_PAREN', 6, 7],
  ['2**3', 'E_UNEXPECTED_TOKEN', 2, 3], ['2^^3', 'E_UNEXPECTED_TOKEN', 2, 3],
  ['2//3', 'E_UNEXPECTED_TOKEN', 2, 3], ['2^', 'E_UNEXPECTED_TOKEN', 2, 2],
  ['π@2', 'E_UNEXPECTED_TOKEN', 1, 2], ['😀', 'E_UNEXPECTED_TOKEN', 0, 2],
  ['sin(90°)', 'E_UNEXPECTED_TOKEN', 6, 7], ['1/0', 'E_DIVISION_BY_ZERO', 1, 2],
  ['1÷0', 'E_DIVISION_BY_ZERO', 1, 2], ['1/(2-2)', 'E_DIVISION_BY_ZERO', 1, 2],
  ['sqrt(-1)', 'E_DOMAIN', 0, 8], ['ln(0)', 'E_DOMAIN', 0, 5],
  ['asin(2)', 'E_DOMAIN', 0, 7], ['acos(-2)', 'E_DOMAIN', 0, 8],
  ['log(-1)', 'E_DOMAIN', 0, 7], ['log2(0)', 'E_DOMAIN', 0, 7],
  ['logb(1,2)', 'E_DOMAIN', 0, 9], ['logb(-2,4)', 'E_DOMAIN', 0, 10],
  ['root(0,2)', 'E_DOMAIN', 0, 9], ['root(2,-1)', 'E_DOMAIN', 0, 10],
  ['root(0.5,2)', 'E_DOMAIN', 0, 11], ['root(-2,0)', 'E_DIVISION_BY_ZERO', 0, 10],
  ['mod(2,0)', 'E_DIVISION_BY_ZERO', 0, 8], ['atan2(0,0)', 'E_DOMAIN', 0, 10],
  ['0^0', 'E_DOMAIN', 1, 2], ['(-2)^0.5', 'E_DOMAIN', 4, 5],
  ['0^-2', 'E_DIVISION_BY_ZERO', 1, 2], ['(-1)!', 'E_DOMAIN', 4, 5],
  ['1.5!', 'E_DOMAIN', 3, 4], ['1001!', 'E_RESOURCE_LIMIT', 4, 5],
  ['unknown', 'E_UNKNOWN_VARIABLE', 0, 7], ['ans', 'E_UNKNOWN_VARIABLE', 0, 3],
  ['missing(2)', 'E_UNKNOWN_FUNCTION', 0, 7], ['constructor(2)', 'E_UNKNOWN_FUNCTION', 0, 11],
  ['constructor', 'E_UNKNOWN_VARIABLE', 0, 11], ['sqrt()', 'E_ARGUMENT_COUNT', 0, 6],
  ['sqrt(1,2)', 'E_ARGUMENT_COUNT', 0, 9], ['min()', 'E_ARGUMENT_COUNT', 0, 5],
  ['max()', 'E_ARGUMENT_COUNT', 0, 5], ['atan2(1)', 'E_ARGUMENT_COUNT', 0, 8],
  ['logb(2)', 'E_ARGUMENT_COUNT', 0, 7], ['1e10001', 'E_OVERFLOW', 0, 7],
  ['1e-10001', 'E_OVERFLOW', 0, 8], ['1e10000*10', 'E_OVERFLOW', 7, 8],
  ['1e-10000/10', 'E_OVERFLOW', 8, 9], ['exp(30000)', 'E_OVERFLOW', 0, 10],
  ['tan(90)', 'E_DOMAIN', 0, 7], ['tan(270)', 'E_DOMAIN', 0, 8],
  ['tan(-90)', 'E_DOMAIN', 0, 8], ['tan(450)', 'E_DOMAIN', 0, 8],
].map(([src, code, start, end]) => ({
  src: String(src), code: String(code), start: Number(start), end: Number(end),
  ctx: String(src).startsWith('tan(') ? { angleMode: 'deg' } : undefined,
}));
