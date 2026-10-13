import { describe, expect, it } from 'vitest';
import {
  initialSimpleState,
  simpleReducer,
  validateRestore,
  type SimpleAction,
  type SimpleState,
} from './model';
import { keyCommand } from './keyboard';
function run(keys: string, start = initialSimpleState()): SimpleState {
  return Array.from(keys).reduce((state, key) => {
    const command = keyCommand(key);
    if (!command) throw new Error(`Unknown test key ${key}`);
    return simpleReducer(state, command.action);
  }, start);
}
const act = (state: SimpleState, action: SimpleAction) =>
  simpleReducer(state, action);
const unary = (
  keys: string,
  operation: 'sqrt' | 'square' | 'reciprocal' | 'percent',
) => act(run(keys), { type: 'unary', operation });
describe('immediate calculator arithmetic through the decimal engine', () => {
  it.each([
    ['0.1+0.2=', '0.3'],
    ['100+10%=', '110'],
    ['200-10%=', '180'],
    ['50*10%=', '5'],
    ['50/10%=', '500'],
    ['5=', '5'],
    ['2+3==', '8'],
    ['2+3===', '11'],
    ['10-3==', '4'],
    ['2*3==', '18'],
    ['16/2==', '4'],
    ['100+10%==', '120'],
    ['200-10%==', '160'],
    ['50*10%==', '0.5'],
    ['2+*3=', '6'],
    ['2+-3=', '-1'],
    ['8*/2=', '4'],
    ['2+3*4=', '20'],
    ['20/2+5=', '15'],
    ['2+=', '4'],
    ['3*=', '9'],
    ['7==', '7'],
    ['00012=', '12'],
    ['.5+.25=', '0.75'],
    ['1,5+2,5=', '4'],
    ['2+3=4=', '4'],
    ['2+3=+4=', '9'],
    ['2+3=+4==', '13'],
    ['0%=', '0'],
    ['10%=', '0.1'],
    ['0+10%=', '0'],
    ['0*5=', '0'],
    ['1/3*3=', '0.99999999999999999999999999999999999999999999999999'],
    ['9999999999999999+1=', '10000000000000000'],
    ['12345678901234567', '1234567890123456'],
    ['12..3', '12.3'],
    ['000000', '0'],
    ['1+2+3+4=', '10'],
    ['5-8=', '-3'],
    ['5-8=2=', '2'],
    ['2*3=+4=', '10'],
    ['100-100%=', '0'],
    ['100+0%=', '100'],
  ])('%s -> %s', (keys, expected) =>
    expect(run(keys).entry.value).toBe(expected),
  );
});
describe('editing, unary operations and failures', () => {
  it('starts at zero with no pending state', () =>
    expect(initialSimpleState()).toMatchObject({
      phase: 'entry',
      entry: { value: '0' },
      memory: null,
      error: null,
    }));
  it('backspaces one digit', () =>
    expect(act(run('123'), { type: 'backspace' }).entry.value).toBe('12'));
  it('backspaces decimal separator', () =>
    expect(act(run('1.'), { type: 'backspace' }).entry.value).toBe('1'));
  it('backspaces last digit to zero', () =>
    expect(act(run('1'), { type: 'backspace' }).entry.value).toBe('0'));
  it('does not edit a result with backspace', () =>
    expect(act(run('2+3='), { type: 'backspace' }).entry.value).toBe('5'));
  it('does not edit waiting left operand', () =>
    expect(act(run('12+'), { type: 'backspace' }).entry.value).toBe('12'));
  it('CE preserves a pending operation', () =>
    expect(
      run('4=', act(run('12+99'), { type: 'clearEntry' })).entry.value,
    ).toBe('16'));
  it('C clears a pending operation', () =>
    expect(run('4=', act(run('12+99'), { type: 'clear' })).entry.value).toBe(
      '4',
    ));
  it('changes sign twice', () =>
    expect(
      act(act(run('12'), { type: 'sign' }), { type: 'sign' }).entry.value,
    ).toBe('12'));
  it('allows negative zero before typing', () =>
    expect(
      run('5', act(initialSimpleState(), { type: 'sign' })).entry.value,
    ).toBe('-5'));
  it('subtracts a signed rhs', () =>
    expect(run('=', act(run('5+3'), { type: 'sign' })).entry.value).toBe('2'));
  it('sqrt positive', () => expect(unary('9', 'sqrt').entry.value).toBe('3'));
  it('sqrt zero', () => expect(unary('0', 'sqrt').entry.value).toBe('0'));
  it('sqrt negative is a domain error', () =>
    expect(
      act(act(run('9'), { type: 'sign' }), { type: 'unary', operation: 'sqrt' })
        .error,
    ).toBe('domain'));
  it('squares a negative number', () =>
    expect(
      act(act(run('3'), { type: 'sign' }), {
        type: 'unary',
        operation: 'square',
      }).entry.value,
    ).toBe('9'));
  it('reciprocal', () =>
    expect(unary('4', 'reciprocal').entry.value).toBe('0.25'));
  it('reciprocal zero', () =>
    expect(unary('0', 'reciprocal').error).toBe('divisionByZero'));
  it('division by zero', () =>
    expect(run('1/0=').error).toBe('divisionByZero'));
  it('zero divided by zero', () =>
    expect(run('0/0=').error).toBe('divisionByZero'));
  it('a digit recovers after error', () =>
    expect(run('5', run('1/0=')).error).toBeNull());
  it('CE recovers after error', () =>
    expect(act(run('1/0='), { type: 'clearEntry' }).phase).toBe('entry'));
  it('equals after error stays in error', () =>
    expect(run('==', run('1/0=')).error).toBe('divisionByZero'));
  it('invalid digit gives typed error', () =>
    expect(act(initialSimpleState(), { type: 'digit', digit: 'a' }).error).toBe(
      'invalid',
    ));
  it('max 16 digits excludes minus and decimal separator', () =>
    expect(
      run('12345678901234567', act(run('.'), { type: 'sign' })).entry.value,
    ).toBe('-0.123456789012345'));
  it('unary operand participates in pending addition', () =>
    expect(run('=', unary('5+9', 'sqrt')).entry.value).toBe('8'));
  it('typing after unary replaces current operand', () =>
    expect(run('4=', unary('5+9', 'sqrt')).entry.value).toBe('9'));
  it('sign after percent negates its effective amount', () =>
    expect(run('=', act(run('100+10%'), { type: 'sign' })).entry.value).toBe(
      '90',
    ));
  it('decimal after a result starts a new entry', () =>
    expect(run('.5', run('2+3=')).entry.value).toBe('0.5'));
  it('supports exponent paste', () =>
    expect(
      act(initialSimpleState(), { type: 'paste', value: '1e100' }).entry.value,
    ).toBe('1e+100'));
  it('rejects expression paste', () =>
    expect(
      act(initialSimpleState(), { type: 'paste', value: '2+3' }).error,
    ).toBe('invalid'));
  it('rejects too long numeric paste', () =>
    expect(
      act(initialSimpleState(), { type: 'paste', value: '12345678901234567' })
        .error,
    ).toBe('invalid'));
  it('pasted rhs replaces entry', () =>
    expect(
      run('=', act(run('5+'), { type: 'paste', value: '2.5' })).entry.value,
    ).toBe('7.5'));
  it('engine range overflow is a readable error', () =>
    expect(
      act(act(initialSimpleState(), { type: 'paste', value: '1e10000' }), {
        type: 'unary',
        operation: 'square',
      }).error,
    ).toBe('overflow'));
});
describe('memory', () => {
  const memory = (
    state: SimpleState,
    operation: 'MC' | 'MR' | 'M+' | 'M-' | 'MS',
  ) => act(state, { type: 'memory', operation });
  it('MS stores the operand', () =>
    expect(memory(run('42'), 'MS').memory).toBe('42'));
  it('MS zero still activates memory', () =>
    expect(memory(run('0'), 'MS').memory).toBe('0'));
  it('C preserves memory', () =>
    expect(act(memory(run('42'), 'MS'), { type: 'clear' }).memory).toBe('42'));
  it('MC removes memory', () =>
    expect(memory(memory(run('42'), 'MS'), 'MC').memory).toBeNull());
  it('MR with empty memory does nothing', () =>
    expect(memory(run('42'), 'MR').entry.value).toBe('42'));
  it('MR replaces rhs', () =>
    expect(
      run(
        '=',
        memory(run('5+', act(memory(run('7'), 'MS'), { type: 'clear' })), 'MR'),
      ).entry.value,
    ).toBe('12'));
  it('M+ initializes memory', () =>
    expect(memory(run('0.1'), 'M+').memory).toBe('0.1'));
  it('M- initializes negative memory', () =>
    expect(memory(run('2'), 'M-').memory).toBe('-2'));
  it('M+ uses decimal engine', () =>
    expect(
      memory(run('0.2', act(memory(run('0.1'), 'MS'), { type: 'clear' })), 'M+')
        .memory,
    ).toBe('0.3'));
  it('M- subtracts', () =>
    expect(
      memory(run('3', act(memory(run('10'), 'MS'), { type: 'clear' })), 'M-')
        .memory,
    ).toBe('7'));
  it('MS ignores calculation errors', () =>
    expect(
      memory(run('1/0=', act(memory(run('42'), 'MS'), { type: 'clear' })), 'MS')
        .memory,
    ).toBe('42'));
  it('MR recovers from error', () =>
    expect(
      memory(run('1/0=', act(memory(run('42'), 'MS'), { type: 'clear' })), 'MR')
        .entry.value,
    ).toBe('42'));
});
describe('history and reducer purity', () => {
  it('records equals only', () => expect(run('2+3').completed).toEqual([]));
  it('records every repeated equals, even in a batch', () =>
    expect(run('2+3==').completed.map((c) => c.result)).toEqual(['5', '8']));
  it('acknowledges through a sequence without dropping later entries', () =>
    expect(
      act(run('2+3=='), { type: 'acknowledge', through: 1 }).completed.map(
        (c) => c.id,
      ),
    ).toEqual([2]));
  it('restores expression before equals', () => {
    const result = run('2+3=');
    const restored = act(result, {
      type: 'restore',
      payload: result.completed[0]?.payload,
    });
    expect(restored).toMatchObject({
      phase: 'entry',
      accumulator: '2',
      operator: '+',
      entry: { value: '3' },
    });
    expect(run('=', restored).entry.value).toBe('5');
  });
  it('restores contextual percentage', () => {
    const result = run('100+10%=');
    const restored = act(result, {
      type: 'restore',
      payload: result.completed[0]?.payload,
    });
    expect(restored.error).toBeNull();
    expect(run('=', restored).entry.value).toBe('110');
  });
  it('restores unary expression', () => {
    const result = run('=', unary('9', 'sqrt'));
    expect(
      validateRestore(result.completed[0]?.payload)?.entry.expression,
    ).toBe('sqrt(9)');
  });
  it.each([
    null,
    {},
    { version: 2 },
    {
      version: 1,
      entry: { value: '1', expression: '2' },
      accumulator: null,
      operator: null,
    },
    {
      version: 1,
      entry: { value: '1', expression: '1' },
      accumulator: '3',
      operator: null,
    },
  ])('rejects corrupt snapshot %j', (payload) =>
    expect(validateRestore(payload)).toBeNull(),
  );
  it('does not mutate prior state', () => {
    const state = run('2+3');
    const snapshot = JSON.stringify(state);
    Object.freeze(state);
    Object.freeze(state.entry);
    Object.freeze(state.completed);
    expect(simpleReducer(state, { type: 'equals' }).entry.value).toBe('5');
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
