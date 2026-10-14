import type { MessageKey } from '../shared/i18n';
import type { ModeId } from '../shared/modes';
export interface Shortcut {
  id: string;
  keys: readonly string[];
  label: MessageKey;
  modes?: readonly ModeId[];
  scope?: 'editor' | 'canvas';
  inInput?: boolean;
}
export const shortcuts: readonly Shortcut[] = [
  {
    id: 'palette',
    keys: ['Control+k', 'Meta+k'],
    label: 'comfort.palette',
    inInput: true,
  },
  { id: 'help', keys: ['?'], label: 'comfort.shortcuts' },
  { id: 'history', keys: ['Control+h'], label: 'history.toggle' },
  {
    id: 'presentation',
    keys: ['Control+Shift+p'],
    label: 'comfort.presentation',
  },
  { id: 'settings', keys: ['Control+,'], label: 'shell.settings' },
  ...(['simple', 'scientific', 'convert', 'graph'] as const).map((mode, i) => ({
    id: `mode.${mode}`,
    keys: [`Alt+${i + 1}`],
    label: `mode.${mode}` as MessageKey,
  })),
  ...Array.from({ length: 10 }, (_, n) => ({
    id: `simple.${n}`,
    keys: [String(n)],
    label: 'comfort.digits' as const,
    modes: ['simple'] as const,
  })),
  ...(['+', '-', '*', '/'] as const).map((key) => ({
    id: `simple.${key}`,
    keys: [key],
    label: 'comfort.operators' as const,
    modes: ['simple'] as const,
  })),
  {
    id: 'simple.decimal',
    keys: ['.', ','],
    label: 'simple.decimal',
    modes: ['simple'],
  },
  {
    id: 'simple.equals',
    keys: ['Enter', '='],
    label: 'simple.equals',
    modes: ['simple'],
  },
  {
    id: 'simple.backspace',
    keys: ['Backspace'],
    label: 'simple.backspace',
    modes: ['simple'],
  },
  {
    id: 'simple.clear',
    keys: ['Escape'],
    label: 'simple.clear',
    modes: ['simple'],
  },
  {
    id: 'simple.clearEntry',
    keys: ['Delete'],
    label: 'simple.clearEntry',
    modes: ['simple'],
  },
  {
    id: 'simple.percent',
    keys: ['%'],
    label: 'simple.percent',
    modes: ['simple'],
  },
  {
    id: 'convert.swap',
    keys: ['Control+Shift+s'],
    label: 'convert.swap',
    modes: ['convert'],
  },
  {
    id: 'convert.quick',
    keys: ['/'],
    label: 'convert.quick',
    modes: ['convert'],
  },
  {
    id: 'convert.digits',
    keys: Array.from({ length: 10 }, (_, n) => String(n)),
    label: 'comfort.digits',
    modes: ['convert'],
  },
  {
    id: 'scientific.evaluate',
    keys: ['Enter'],
    label: 'scientific.evaluate',
    modes: ['scientific', 'graph'],
    scope: 'editor',
    inInput: true,
  },
  {
    id: 'scientific.browse',
    keys: ['ArrowUp', 'ArrowDown'],
    label: 'comfort.browse',
    modes: ['scientific', 'graph'],
    scope: 'editor',
    inInput: true,
  },
  {
    id: 'scientific.clear',
    keys: ['Escape'],
    label: 'scientific.clear',
    modes: ['scientific', 'graph'],
    scope: 'editor',
    inInput: true,
  },
  {
    id: 'scientific.complete',
    keys: ['Tab'],
    label: 'comfort.complete',
    modes: ['scientific', 'graph'],
    scope: 'editor',
    inInput: true,
  },
  {
    id: 'graph.zoom',
    keys: ['+', '=', '-', '−'],
    label: 'comfort.zoom',
    modes: ['graph'],
    scope: 'canvas',
  },
  {
    id: 'graph.trace',
    keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    label: 'comfort.trace',
    modes: ['graph'],
    scope: 'canvas',
  },
  {
    id: 'graph.clearTrace',
    keys: ['Escape'],
    label: 'comfort.clearTrace',
    modes: ['graph'],
    scope: 'canvas',
  },
  {
    id: 'graph.context',
    keys: ['Shift+F10'],
    label: 'graph.actions',
    modes: ['graph'],
    scope: 'canvas',
  },
];
export interface KeyEvent {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}
export function matchesKey(chord: string, event: KeyEvent): boolean {
  const parts = chord.split('+');
  const key = chord === '+' ? '+' : (parts.pop() ?? '');
  const modifiers = new Set(parts);
  return (
    key.toLowerCase() === event.key.toLowerCase() &&
    !!event.ctrlKey === modifiers.has('Control') &&
    !!event.metaKey === modifiers.has('Meta') &&
    !!event.altKey === modifiers.has('Alt') &&
    ((key.length === 1 && /[^a-z0-9]/i.test(key) && !modifiers.has('Shift')) ||
      !!event.shiftKey === modifiers.has('Shift'))
  );
}
export function shortcutMatches(id: string, event: KeyEvent): boolean {
  return (
    shortcuts
      .find((s) => s.id === id)
      ?.keys.some((k) => matchesKey(k, event)) ?? false
  );
}
export function shortcutHint(id: string): string {
  return shortcuts.find((s) => s.id === id)?.keys.join(' / ') ?? '';
}
export function isInputTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    !!target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"]',
    )
  );
}
export function shortcutConflicts(registry: readonly Shortcut[]): string[] {
  const conflicts: string[] = [];
  for (let i = 0; i < registry.length; i++)
    for (const b of registry.slice(i + 1)) {
      const a = registry[i];
      if (
        !a ||
        (a.scope && b.scope && a.scope !== b.scope) ||
        (a.modes && b.modes && !a.modes.some((m) => b.modes?.includes(m)))
      )
        continue;
      if (
        a.keys.some((k) =>
          b.keys.some((other) => k.toLowerCase() === other.toLowerCase()),
        )
      )
        conflicts.push(`${a.id}:${b.id}`);
    }
  return conflicts;
}
export function findGlobalShortcut(
  event: KeyEvent,
  input: boolean,
): Shortcut | undefined {
  return shortcuts.find(
    (s) =>
      !s.modes &&
      !s.scope &&
      (!input || s.inInput) &&
      s.keys.some((k) => matchesKey(k, event)),
  );
}
