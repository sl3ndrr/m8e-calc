import { expect, it } from 'vitest';
import {
  shortcuts,
  shortcutConflicts,
  findGlobalShortcut,
  isInputTarget,
  matchesKey,
} from './shortcuts';
it('has no conflicts in any simultaneously active mode or focus scope', () => {
  expect(shortcutConflicts(shortcuts)).toEqual([]);
  expect(
    shortcutConflicts([
      ...shortcuts,
      {
        id: 'collision',
        keys: ['Control+k'],
        label: 'shell.settings',
        modes: ['graph'],
      },
    ]),
  ).toContain('palette:collision');
});
it('suppresses input shortcuts except explicit palette/editor entries', () => {
  expect(findGlobalShortcut({ key: 'h', ctrlKey: true }, true)).toBeUndefined();
  expect(
    findGlobalShortcut({ key: '?', shiftKey: true }, true),
  ).toBeUndefined();
  expect(findGlobalShortcut({ key: 'k', ctrlKey: true }, true)?.id).toBe(
    'palette',
  );
  expect(findGlobalShortcut({ key: 'k', metaKey: true }, true)?.id).toBe(
    'palette',
  );
  expect(findGlobalShortcut({ key: '?', shiftKey: true }, false)?.id).toBe(
    'help',
  );
  expect(
    matchesKey('Control+k', { key: 'k', ctrlKey: true, altKey: true }),
  ).toBe(false);
  expect(matchesKey('+', { key: '+', shiftKey: true })).toBe(true);
  expect(isInputTarget(document.createElement('input'))).toBe(true);
  expect(isInputTarget(document.createElement('button'))).toBe(false);
});
