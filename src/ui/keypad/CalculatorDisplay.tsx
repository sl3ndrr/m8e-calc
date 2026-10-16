import { useLayoutEffect, useRef } from 'react';
import { animateElement } from '../animateElement';
import { Button } from '../Button';
import { displayFontSize } from './displayFit';
import { useMediaQuery } from '../useMediaQuery';
import { useSettingsStore } from '../../shared/settingsStore';

import './CalculatorDisplay.css';
function Character({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const level = useSettingsStore((s) => s.motionLevel);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || level === 'off') return;
    const spatial = level === 'full' && !reduced;
    const animation = animateElement(
      node,
      spatial
        ? [
            { transform: 'translateY(55%)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
          ]
        : [{ opacity: 0 }, { opacity: 1 }],
      spatial ? 'spatial-fast' : 'effects-fast',
    );
    return () => {
      animation.stop();
      node.style.transform = '';
      node.style.opacity = '';
    };
  }, [value, level, reduced]);
  return (
    <span className="calculator-character" aria-hidden="true">
      <span ref={ref}>{value}</span>
    </span>
  );
}
export interface CalculatorDisplayProps {
  value: string;
  expression: string;
  copyLabel: string;
  resultLabel: string;
  expressionLabel: string;
  error?: string;
  onCopy: () => void;
}
export function CalculatorDisplay({
  value,
  expression,
  copyLabel,
  resultLabel,
  expressionLabel,
  error,
  onCopy,
}: CalculatorDisplayProps) {
  const viewport = useRef<HTMLSpanElement>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const number = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const box = viewport.current;
    const probe = measure.current;
    const ink = number.current;
    if (!box || !probe || !ink) return;
    let disposed = false;
    const fit = () => {
      if (disposed) return;
      const style = getComputedStyle(probe);
      const maximum = parseFloat(style.fontSize);
      const minimum = Math.max(
        24,
        1.5 * parseFloat(getComputedStyle(document.documentElement).fontSize),
      );
      ink.style.fontSize = `${displayFontSize(
        box.clientWidth,
        probe.getBoundingClientRect().width,
        maximum,
        minimum,
        parseFloat(style.getPropertyValue('--calculator-ink-gutter')),
      )}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    observer.observe(probe);
    document.fonts?.ready.then(fit);
    document.fonts?.addEventListener('loadingdone', fit);
    return () => {
      disposed = true;
      observer.disconnect();
      document.fonts?.removeEventListener('loadingdone', fit);
    };
  }, [value]);
  return (
    <div className="calculator-display" data-error={!!error || undefined}>
      <div
        className="calculator-expression expression"
        role="group"
        aria-label={expressionLabel}
      >
        {expression || '\u00a0'}
      </div>
      <Button
        variant="text"
        className="calculator-result"
        aria-label={copyLabel}
        isDisabled={!!error}
        onPress={onCopy}
      >
        <span ref={viewport} className="calculator-viewport">
          <span ref={measure} className="calculator-measure" aria-hidden="true">
            {value}
          </span>
          <span ref={number} className="calculator-value">
            {Array.from(value).map((character, index) => (
              <Character key={value.length - index} value={character} />
            ))}
          </span>
        </span>
      </Button>
      <output
        className="calculator-announcement"
        aria-label={resultLabel}
        aria-live="polite"
        aria-atomic="true"
      >
        {error ?? value}
      </output>
      {error && <p className="calculator-error">{error}</p>}
    </div>
  );
}
