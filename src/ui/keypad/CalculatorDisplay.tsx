import { useEffect, useRef } from 'react';
import { animate } from 'motion';
import { Button } from '../Button';
import { useSpring } from '../useSpring';
import { useMediaQuery } from '../useMediaQuery';
import { useSettingsStore } from '../../shared/settingsStore';
import { springs } from '../../styles/motion';
import './CalculatorDisplay.css';
function Character({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const level = useSettingsStore((s) => s.motionLevel);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  useEffect(() => {
    const node = ref.current;
    if (!node || level === 'off') return;
    const spatial = level === 'full' && !reduced;
    const token = springs[spatial ? 'spatial-fast' : 'effects-fast'];
    const animation = animate(
      node,
      spatial ? { y: ['55%', '0%'], opacity: [0, 1] } : { opacity: [0, 1] },
      {
        type: 'spring',
        stiffness: token.stiffness,
        damping: 2 * token.damping * Math.sqrt(token.stiffness),
      },
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
