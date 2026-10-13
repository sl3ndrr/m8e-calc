import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { browseHistory, insertAtSelection, singleLine } from './editorModel';
import { functionInsertion } from './ScientificKeypad';
describe('scientific editor insertion', () => {
  it.each([
    [
      { text: '1+2', anchor: 2, head: 2 },
      { text: 'sin(', suffix: ')' },
      { text: '1+sin()2', anchor: 6, head: 6 },
    ],
    [
      { text: '1+2', anchor: 2, head: 3 },
      { text: 'sin(', suffix: ')' },
      { text: '1+sin(2)', anchor: 8, head: 8 },
    ],
    [
      { text: '1+2', anchor: 3, head: 2 },
      { text: 'pi' },
      { text: '1+pi', anchor: 4, head: 4 },
    ],
    [
      { text: '', anchor: 0, head: 0 },
      functionInsertion('integral'),
      { text: 'integral(, x, 0, 1)', anchor: 9, head: 9 },
    ],
    [
      { text: 'x^2', anchor: 0, head: 3 },
      functionInsertion('integral'),
      { text: 'integral(x^2, x, 0, 1)', anchor: 22, head: 22 },
    ],
  ])('inserts or wraps at the cursor', (state, insertion, expected) =>
    expect(insertAtSelection(state, insertion)).toEqual(expected),
  );
  it('preserves text outside any valid selection', () =>
    fc.assert(
      fc.property(fc.string(), fc.nat(), fc.nat(), (text, a, b) => {
        const from = Math.min(a % (text.length + 1), b % (text.length + 1)),
          to = Math.max(a % (text.length + 1), b % (text.length + 1));
        const next = insertAtSelection(
          { text, anchor: from, head: to },
          { text: 'sin(', suffix: ')' },
        );
        expect(next.text).toBe(
          text.slice(0, from) +
            'sin(' +
            text.slice(from, to) +
            ')' +
            text.slice(to),
        );
        expect(next.head).toBeGreaterThanOrEqual(0);
        expect(next.head).toBeLessThanOrEqual(next.text.length);
      }),
    ));
  it('remembers a draft while browsing and respects boundaries', () => {
    const entries = ['2+3', 'sin(30)'];
    let current = { cursor: { index: -1, draft: '' }, text: 'draft' };
    current = browseHistory(current.cursor, -1, current.text, entries);
    expect(current.text).toBe('2+3');
    current = browseHistory(current.cursor, -1, current.text, entries);
    expect(current.text).toBe('sin(30)');
    current = browseHistory(current.cursor, -1, current.text, entries);
    expect(current.cursor.index).toBe(1);
    current = browseHistory(current.cursor, 1, current.text, entries);
    current = browseHistory(current.cursor, 1, current.text, entries);
    expect(current.text).toBe('draft');
    expect(browseHistory({ index: -1, draft: '' }, -1, 'draft', []).text).toBe(
      'draft',
    );
  });
  it('normalizes pasted lines', () =>
    expect(singleLine('1\r\n+\n2')).toBe('1 + 2'));
});
