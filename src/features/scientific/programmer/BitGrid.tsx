import { useRef, type CSSProperties } from 'react';
import { t, type Locale } from '../../../shared/i18n';
import { useSpring } from '../../../ui/useSpring';
import type { WordWidth } from '../../../engine/programmer';
import { setBit } from './model';
function Bit({
  index,
  enabled,
  field,
  locale,
  onToggle,
}: {
  index: number;
  enabled: boolean;
  field: string;
  locale: Locale;
  onToggle: () => void;
}) {
  const spring = useSpring(enabled ? 1 : 0);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={t('programmer.bit', locale, { index })}
      data-bit={index}
      data-field={field}
      data-on={enabled}
      className="programmer-bit"
      style={{ '--bit-morph': spring } as CSSProperties}
      onClick={(event) => {
        if (event.detail === 0) onToggle();
      }}
    >
      <small aria-hidden="true">{index}</small>
      <span aria-hidden="true">{enabled ? '1' : '0'}</span>
    </button>
  );
}
export function BitGrid({
  bits,
  width,
  locale,
  onChange,
  onCommit,
  float = false,
}: {
  bits: bigint;
  width: WordWidth;
  locale: Locale;
  onChange: (bits: bigint) => void;
  onCommit: (bits: bigint) => void;
  float?: boolean;
}) {
  const gesture = useRef<{
    pointer: number;
    enabled: boolean;
    bits: bigint;
  } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const paint = (index: number) => {
    const g = gesture.current;
    if (!g) return;
    const next = setBit(g.bits, index, g.enabled, {
      width,
      signed: false,
      overflow: 'wrap',
    });
    if (next !== g.bits) {
      g.bits = next;
      onChange(next);
    }
  };
  const finish = () => {
    const g = gesture.current;
    if (g) {
      gesture.current = null;
      onCommit(g.bits);
    }
  };
  return (
    <div
      ref={grid}
      className="programmer-bit-grid"
      style={{ '--bit-columns': Math.min(16, width) } as CSSProperties}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const target =
          event.target instanceof Element
            ? event.target.closest<HTMLButtonElement>('[data-bit]')
            : null;
        if (!target) return;
        const index = Number(target.dataset.bit);
        gesture.current = {
          pointer: event.pointerId,
          enabled: ((bits >> BigInt(index)) & 1n) === 0n,
          bits,
        };
        grid.current?.setPointerCapture(event.pointerId);
        paint(index);
      }}
      onPointerMove={(event) => {
        if (gesture.current?.pointer !== event.pointerId) return;
        const target = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest<HTMLButtonElement>('[data-bit]');
        if (target && grid.current?.contains(target))
          paint(Number(target.dataset.bit));
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
    >
      {Array.from({ length: width / 4 }, (_, nibble) => {
        const high = width - 1 - nibble * 4,
          digit = Number((bits >> BigInt(high - 3)) & 15n)
            .toString(16)
            .toUpperCase();
        return (
          <div className="programmer-nibble" key={high}>
            {Array.from({ length: 4 }, (_, i) => {
              const index = high - i,
                enabled = Boolean((bits >> BigInt(index)) & 1n),
                exponent = width === 32 ? 8 : 11;
              const field = float
                ? index === width - 1
                  ? 'sign'
                  : index >= width - 1 - exponent
                    ? 'exponent'
                    : 'mantissa'
                : 'word';
              return (
                <Bit
                  key={index}
                  index={index}
                  enabled={enabled}
                  field={field}
                  locale={locale}
                  onToggle={() => {
                    const next = setBit(bits, index, !enabled, {
                      width,
                      signed: false,
                      overflow: 'wrap',
                    });
                    onChange(next);
                    onCommit(next);
                  }}
                />
              );
            })}
            <output className="programmer-nibble-hex" aria-hidden="true">
              {digit}
            </output>
          </div>
        );
      })}
    </div>
  );
}
