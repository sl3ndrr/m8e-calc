import { expect, it } from 'vitest';
import { keyCommand } from './keyboard';
it.each([
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '+',
  '-',
  '*',
  '/',
  '.',
  ',',
  'Enter',
  '=',
  'Backspace',
  'Escape',
  'Delete',
  '%',
])('maps keyboard key %s', (key) => expect(keyCommand(key)).not.toBeNull());
it.each(['h', 'v', 'a', 'Tab', 'ArrowLeft', 'F6', ' '])(
  'leaves unrelated %s alone',
  (key) => expect(keyCommand(key)).toBeNull(),
);
