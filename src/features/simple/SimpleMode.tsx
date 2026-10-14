import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { animateElement } from '../../ui/animateElement';
import { CalculatorDisplay } from '../../ui/keypad/CalculatorDisplay';
import { Keypad } from '../../ui/keypad/Keypad';
import { KeypadKey } from '../../ui/keypad/Keypad';
import { snackbarQueue } from '../../ui/snackbarQueue';
import { useMediaQuery } from '../../ui/useMediaQuery';
import type { KeyRole } from '../../ui/keypad/Keypad';
import { t, type MessageKey } from '../../shared/i18n';
import { useAppStore } from '../../shared/store';
import { useSettingsStore } from '../../shared/settingsStore';
import { useHistoryStore } from '../../shared/historyStore';
import { useModeHistory } from '../../shared/useModeHistory';
import type { HistoryEntry } from '../../shared/history';

import { simpleReducer, type SimpleAction } from './model';
import {
  displayExpression,
  displayNumber,
  displayState,
  numberLocale,
  parsePastedNumber,
} from './format';
import { keyCommand } from './keyboard';
import './SimpleMode.css';
import { isInputTarget, shortcutHint } from '../../app/shortcuts';
import { CopyLinkButton } from '../../app/CopyLinkButton';
import { initialLinkedSimple, simpleLink } from '../../app/simpleLinks';
interface KeyDefinition {
  id: string;
  text: string;
  label: MessageKey;
  role: KeyRole;
  action: SimpleAction;
}
const keys: KeyDefinition[] = [
  {
    id: 'percent',
    text: '%',
    label: 'simple.percent',
    role: 'function',
    action: { type: 'unary', operation: 'percent' },
  },
  {
    id: 'clearEntry',
    text: 'CE',
    label: 'simple.clearEntry',
    role: 'clear',
    action: { type: 'clearEntry' },
  },
  {
    id: 'clear',
    text: 'C',
    label: 'simple.clear',
    role: 'clear',
    action: { type: 'clear' },
  },
  {
    id: 'backspace',
    text: '⌫',
    label: 'simple.backspace',
    role: 'clear',
    action: { type: 'backspace' },
  },
  {
    id: 'reciprocal',
    text: '1/x',
    label: 'simple.reciprocal',
    role: 'function',
    action: { type: 'unary', operation: 'reciprocal' },
  },
  {
    id: 'square',
    text: 'x²',
    label: 'simple.square',
    role: 'function',
    action: { type: 'unary', operation: 'square' },
  },
  {
    id: 'sqrt',
    text: '√x',
    label: 'simple.sqrt',
    role: 'function',
    action: { type: 'unary', operation: 'sqrt' },
  },
  {
    id: '/',
    text: '÷',
    label: 'simple.divide',
    role: 'operator',
    action: { type: 'operator', operator: '/' },
  },
  ...['7', '8', '9'].map((digit) => ({
    id: digit,
    text: digit,
    label: 'simple.digit' as const,
    role: 'digit' as const,
    action: { type: 'digit' as const, digit },
  })),
  {
    id: '*',
    text: '×',
    label: 'simple.multiply',
    role: 'operator',
    action: { type: 'operator', operator: '*' },
  },
  ...['4', '5', '6'].map((digit) => ({
    id: digit,
    text: digit,
    label: 'simple.digit' as const,
    role: 'digit' as const,
    action: { type: 'digit' as const, digit },
  })),
  {
    id: '-',
    text: '−',
    label: 'simple.subtract',
    role: 'operator',
    action: { type: 'operator', operator: '-' },
  },
  ...['1', '2', '3'].map((digit) => ({
    id: digit,
    text: digit,
    label: 'simple.digit' as const,
    role: 'digit' as const,
    action: { type: 'digit' as const, digit },
  })),
  {
    id: '+',
    text: '+',
    label: 'simple.add',
    role: 'operator',
    action: { type: 'operator', operator: '+' },
  },
  {
    id: 'sign',
    text: '±',
    label: 'simple.sign',
    role: 'function',
    action: { type: 'sign' },
  },
  {
    id: '0',
    text: '0',
    label: 'simple.digit',
    role: 'digit',
    action: { type: 'digit', digit: '0' },
  },
  {
    id: 'decimal',
    text: ',',
    label: 'simple.decimal',
    role: 'digit',
    action: { type: 'decimal' },
  },
  {
    id: 'equals',
    text: '=',
    label: 'simple.equals',
    role: 'equals',
    action: { type: 'equals' },
  },
];
const keyOrder = [
  'percent',
  'clearEntry',
  'clear',
  'backspace',
  '/',
  '7',
  '8',
  '9',
  'sqrt',
  '*',
  '4',
  '5',
  '6',
  'square',
  '-',
  '1',
  '2',
  '3',
  'reciprocal',
  'equals',
  'sign',
  '0',
  'decimal',
  '+',
];
keys.sort((a, b) => keyOrder.indexOf(a.id) - keyOrder.indexOf(b.id));
const memoryKeys = ['MC', 'MR', 'M+', 'M-', 'MS'] as const;
export default function SimpleMode() {
  const [state, dispatch] = useReducer(
    simpleReducer,
    undefined,
    initialLinkedSimple,
  );
  const [pressed, setPressed] = useState<string[]>([]);
  const locale = useAppStore((s) => s.locale);
  const decimalSeparator = useSettingsStore((s) => s.decimalSeparator);
  const grouping = useSettingsStore((s) => s.grouping);
  const level = useSettingsStore((s) => s.motionLevel);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const root = useRef<HTMLElement>(null);
  const sent = useRef(0);
  const onRestore = useCallback(
    (entry: HistoryEntry) =>
      dispatch({ type: 'restore', payload: entry.payload }),
    [],
  );
  const { add } = useModeHistory('simple', onRestore);
  const preferences = { decimalSeparator, grouping };
  const displayed = displayState(state, locale, preferences);
  useEffect(() => {
    for (const calculation of state.completed) {
      if (calculation.id <= sent.current) continue;
      sent.current = calculation.id;
      add({
        input: displayExpression(calculation.input, locale, {
          decimalSeparator,
          grouping,
        }),
        result: displayNumber(calculation.result, locale, {
          decimalSeparator,
          grouping,
        }),
        payload: {
          ...calculation.payload,
          entry: { ...calculation.payload.entry },
        },
      });
    }
    if (state.completed.length)
      dispatch({ type: 'acknowledge', through: sent.current });
  }, [state.completed, add, locale, decimalSeparator, grouping]);
  useEffect(() => {
    const node = root.current?.querySelector('.calculator-expression');
    if (!node || !state.sequence || level === 'off') return;
    const docked =
      window.matchMedia('(min-width: 1440px)').matches &&
      useHistoryStore.getState().visibility.simple;
    const destination = docked
      ? document.querySelector('.history-entry .history-expression')
      : null;
    const from = node.getBoundingClientRect();
    const to = destination?.getBoundingClientRect();
    const ghost = node.cloneNode(true) as HTMLElement;
    ghost.setAttribute('aria-hidden', 'true');
    ghost.classList.add('simple-history-flight');
    Object.assign(ghost.style, {
      top: `${from.top}px`,
      left: `${from.left}px`,
      width: `${from.width}px`,
    });
    document.body.append(ghost);
    const spatial = level === 'full' && !reduced;
    const animation = animateElement(
      ghost,
      spatial
        ? [
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            {
              transform: `translate(${to ? to.left - from.left : 24}px,${to ? to.top - from.top : -24}px) scale(0.85)`,
              opacity: 0,
            },
          ]
        : [{ opacity: 1 }, { opacity: 0 }],
      spatial ? 'spatial-default' : 'effects-fast',
    );
    void animation.finished.then(() => ghost.remove());
    return () => {
      animation.stop();
      ghost.remove();
    };
  }, [state.sequence, level, reduced]);
  useEffect(() => {
    function available(target: EventTarget | null): boolean {
      if (!root.current || root.current.closest('[inert]')) return false;
      if (
        document.querySelector(
          '[role="dialog"], [role="menu"], [role="listbox"]',
        )
      )
        return false;
      if (isInputTarget(target)) return false;
      return !(
        target instanceof HTMLElement &&
        target.closest('.shell-history, .shell-personalization')
      );
    }
    function down(event: KeyboardEvent): void {
      if (
        !available(event.target) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      const command = keyCommand(event.key);
      if (!command) return;
      // Enter keeps normal activation on controls outside the calculator keypad.
      if (
        event.key === 'Enter' &&
        event.target instanceof HTMLElement &&
        event.target.closest('button, a') &&
        !event.target.closest('.keypad-cell')
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setPressed((current) =>
        current.includes(command.id) ? current : [...current, command.id],
      );
      if (
        !event.repeat ||
        command.action.type === 'digit' ||
        command.action.type === 'backspace'
      )
        dispatch(command.action);
    }
    function up(event: KeyboardEvent): void {
      if (
        event.key === 'Enter' &&
        available(event.target) &&
        event.target instanceof HTMLElement &&
        event.target.closest('.keypad-cell')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
      const command = keyCommand(event.key);
      if (command)
        setPressed((current) => current.filter((id) => id !== command.id));
    }
    function blur(): void {
      setPressed([]);
    }
    function paste(event: ClipboardEvent): void {
      if (!available(event.target)) return;
      event.preventDefault();
      const value = parsePastedNumber(
        event.clipboardData?.getData('text') ?? '',
        locale,
        { decimalSeparator, grouping },
      );
      dispatch({ type: 'paste', value: value ?? '' });
    }
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up, true);
    window.addEventListener('blur', blur);
    window.addEventListener('paste', paste);
    return () => {
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('keyup', up, true);
      window.removeEventListener('blur', blur);
      window.removeEventListener('paste', paste);
    };
  }, [locale, decimalSeparator, grouping]);
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(displayed);
      snackbarQueue.add(
        { message: t('history.copied', locale) },
        { timeout: 5000 },
      );
    } catch {
      snackbarQueue.add(
        { message: t('history.copyError', locale) },
        { timeout: 5000 },
      );
    }
  }
  return (
    <section
      ref={root}
      className="simple-calculator"
      aria-label={t('simple.title', locale)}
    >
      <div className="simple-heading">
        <h1>{t('simple.title', locale)}</h1>
        <CopyLinkButton mode="simple" data={simpleLink(state)} />
        <span
          className="simple-memory"
          role="img"
          aria-label={t(
            state.memory === null
              ? 'simple.memoryEmpty'
              : 'simple.memoryStored',
            locale,
          )}
          data-stored={state.memory !== null || undefined}
        >
          {state.memory !== null ? 'M' : ''}
        </span>
      </div>
      <CalculatorDisplay
        value={displayed}
        expression={displayExpression(state.expression, locale, preferences)}
        copyLabel={t('simple.copy', locale)}
        resultLabel={t('simple.result', locale)}
        expressionLabel={t('simple.expression', locale)}
        error={
          state.error ? t(`simple.error.${state.error}`, locale) : undefined
        }
        onCopy={() => {
          void copy();
        }}
      />
      <div
        className="simple-memory-keys"
        role="group"
        aria-label={t('simple.memory', locale)}
      >
        {memoryKeys.map((operation) => (
          <KeypadKey
            key={operation}
            id={operation}
            label={t(`simple.${operation}`, locale)}
            colorRole="memory"
            disabled={
              (operation === 'MC' || operation === 'MR') &&
              state.memory === null
            }
            onPress={() => dispatch({ type: 'memory', operation })}
          >
            {operation === 'M-' ? 'M−' : operation}
          </KeypadKey>
        ))}
      </div>
      <Keypad label={t('simple.keypad', locale)}>
        {keys.map((key) => (
          <KeypadKey
            key={key.id}
            id={key.id}
            colorRole={key.role}
            shortcut={shortcutHint(`simple.${key.id}`)}
            label={t(key.label, locale, { digit: key.text })}
            active={state.operator === key.id}
            pressed={pressed.includes(key.id)}
            onPress={() => dispatch(key.action)}
          >
            {key.id === 'decimal'
              ? numberLocale(locale, preferences).startsWith('de')
                ? ','
                : '.'
              : key.text}
          </KeypadKey>
        ))}
      </Keypad>
      <p className="simple-keyboard-hint">{t('simple.keyboardHint', locale)}</p>
    </section>
  );
}
