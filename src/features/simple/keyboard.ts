import type { SimpleAction } from './model';
export interface KeyCommand {
  id: string;
  action: SimpleAction;
}
export function keyCommand(key: string): KeyCommand | null {
  if (/^\d$/.test(key))
    return { id: key, action: { type: 'digit', digit: key } };
  if (key === '+' || key === '-' || key === '*' || key === '/')
    return { id: key, action: { type: 'operator', operator: key } };
  if (key === '.' || key === ',')
    return { id: 'decimal', action: { type: 'decimal' } };
  if (key === 'Enter' || key === '=')
    return { id: 'equals', action: { type: 'equals' } };
  if (key === 'Backspace')
    return { id: 'backspace', action: { type: 'backspace' } };
  if (key === 'Escape') return { id: 'clear', action: { type: 'clear' } };
  if (key === 'Delete')
    return { id: 'clearEntry', action: { type: 'clearEntry' } };
  if (key === '%')
    return { id: 'percent', action: { type: 'unary', operation: 'percent' } };
  return null;
}
