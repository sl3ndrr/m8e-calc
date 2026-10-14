import { useState } from 'react';
import { Button } from '../../ui/Button';
import { Keypad } from '../../ui/keypad/Keypad';
import { KeypadKey } from '../../ui/keypad/Keypad';
import { t, type Locale } from '../../shared/i18n';
import { functionRegistry } from '../../engine';
import type { Insertion } from './editorModel';
const rows = [
  ['sqrt', 'cbrt', 'ln', 'exp', 'log', 'log2', 'abs', 'frac'],
  ['sin', 'asin', 'cos', 'acos', 'tan', 'atan', 'sec', 'cot'],
  ['sinh', 'asinh', 'cosh', 'acosh', 'tanh', 'atanh', 'conj', 'arg'],
  ['sum', 'prod', 'integral', 'deriv', 'nCr', 'nPr', 'factorial', 'gamma'],
  ['mean', 'median', 'stdev', 'stdevp', 'variance', 'total', 'min', 'max'],
] as const;
const glyphs: Readonly<Record<string, string>> = {
  sum: 'Σ',
  prod: 'Π',
  integral: '∫',
  deriv: 'd/dx',
  sqrt: '√',
  cbrt: '∛',
};
export function functionInsertion(name: string): Insertion {
  return {
    text: `${name}(`,
    suffix:
      name === 'sum' || name === 'prod'
        ? ', k, 1, 10)'
        : name === 'integral'
          ? ', x, 0, 1)'
          : name === 'deriv'
            ? ', x, 0)'
            : ')',
  };
}
export function ScientificKeypad({
  locale,
  insert,
  evaluate,
  clear,
  store,
  recall,
}: {
  locale: Locale;
  insert: (insertion: Insertion) => void;
  evaluate: () => void;
  clear: () => void;
  store: () => void;
  recall: () => void;
}) {
  const [second, setSecond] = useState(false);
  return (
    <section
      className="scientific-keypad-panel"
      aria-label={t('scientific.keypad', locale)}
    >
      <div className="scientific-panel-heading">
        <h2>{t('scientific.keypad', locale)}</h2>
        <Button
          variant="tonal"
          isSelected={second}
          onSelectedChange={setSecond}
          aria-label={t('scientific.second', locale)}
        >
          2nd
        </Button>
      </div>
      <Keypad label={t('scientific.functions', locale)}>
        {rows.flatMap((row, ri) =>
          [0, 2, 4, 6].map((i) => {
            const name = row[i + (second ? 1 : 0)];
            if (!name) return null;
            return (
              <KeypadKey
                key={`${ri}-${i}`}
                id={`${ri}-${i}`}
                colorRole="function"
                label={t('scientific.insertFunction', locale, {
                  name,
                  description: functionRegistry[name]?.doc[locale] ?? name,
                })}
                onPress={() => insert(functionInsertion(name))}
              >
                <span key={name} className="scientific-flip">
                  {glyphs[name] ?? name}
                </span>
              </KeypadKey>
            );
          }),
        )}
      </Keypad>
      <div className="scientific-memory-actions">
        <Button variant="text" onPress={() => insert({ text: 'ans' })}>
          ans
        </Button>
        <Button
          variant="text"
          aria-label={t('scientific.store', locale)}
          onPress={store}
        >
          STO →
        </Button>
        <Button
          variant="text"
          aria-label={t('scientific.recall', locale)}
          onPress={recall}
        >
          RCL
        </Button>
      </div>
      <Keypad label={t('scientific.numbers', locale)}>
        {[
          '7',
          '8',
          '9',
          '/',
          '4',
          '5',
          '6',
          '*',
          '1',
          '2',
          '3',
          '-',
          '0',
          '.',
          '^',
          '+',
          '(',
          ')',
          ',',
          '!',
        ].map((text) => (
          <KeypadKey
            key={text}
            id={text}
            colorRole={/^[0-9.]$/.test(text) ? 'digit' : 'operator'}
            label={t('scientific.insert', locale, { text })}
            onPress={() => insert({ text })}
          >
            {text === '*' ? '×' : text === '/' ? '÷' : text}
          </KeypadKey>
        ))}
        <KeypadKey
          id="clear"
          colorRole="clear"
          label={t('scientific.clear', locale)}
          onPress={clear}
        >
          C
        </KeypadKey>
        <KeypadKey
          id="pi"
          colorRole="function"
          label={t('scientific.insert', locale, { text: 'pi' })}
          onPress={() => insert({ text: 'pi' })}
        >
          π
        </KeypadKey>
        <KeypadKey
          id="degree"
          colorRole="function"
          label={t('scientific.insert', locale, { text: '°' })}
          onPress={() => insert({ text: '°' })}
        >
          °
        </KeypadKey>
        <KeypadKey
          id="equals"
          colorRole="equals"
          label={t('simple.equals', locale)}
          onPress={evaluate}
        >
          =
        </KeypadKey>
      </Keypad>
    </section>
  );
}
