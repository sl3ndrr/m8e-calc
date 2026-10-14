import type { SimpleAction } from './model';
import { shortcuts, matchesKey } from '../../app/shortcuts';
export interface KeyCommand { id: string; action: SimpleAction }
export function keyCommand(key: string): KeyCommand | null {
  const registered = shortcuts.find((s) => s.id.startsWith('simple.') && s.keys.some((k) => matchesKey(k, { key })));
  if (!registered) return null;
  const id = registered.id.slice(7);
  if (/^\d$/.test(id)) return { id, action: { type: 'digit', digit: id } };
  if (id === '+' || id === '-' || id === '*' || id === '/') return { id, action: { type: 'operator', operator: id } };
  if (id === 'percent') return { id, action: { type: 'unary', operation: 'percent' } };
  if (id === 'decimal' || id === 'equals' || id === 'backspace' || id === 'clear' || id === 'clearEntry') return { id, action: { type: id } };
  return null;
}
