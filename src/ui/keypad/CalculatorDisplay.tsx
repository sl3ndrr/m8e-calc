import { useEffect, useRef } from 'react';
import { animateElement } from '../animateElement';
import { Button } from '../Button';
import { useSpring } from '../useSpring';
import { useMediaQuery } from '../useMediaQuery';
import { useSettingsStore } from '../../shared/settingsStore';

import './CalculatorDisplay.css';
function Character({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const level = useSettingsStore((s) => s.motionLevel);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  useEffect(() => {
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
  const container = useRef<HTMLDivElement>(null);
  const size = useSpring(
    Math.min(7, 48 / Math.max(7, value.length)),
    'effects-default',
  );
  return (
    <div
      ref={container}
      className="calculator-display"
      data-error={!!error || undefined}
    >
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
        <span className="calculator-value" style={{ fontSize: `${size}rem` }}>
          {Array.from(value).map((character, index) => (
            <Character key={value.length - index} value={character} />
          ))}
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
