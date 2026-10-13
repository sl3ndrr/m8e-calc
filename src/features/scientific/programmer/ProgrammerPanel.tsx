import { useState } from 'react';
import { Button, SegmentedControl, TextField } from '../../../ui';
import { t, type Locale, type MessageKey } from '../../../shared/i18n';
import {
  formatBase,
  fromBits,
  parseBase,
  floatToBits,
  floatFromBits,
  composeFloat,
  characterInfo,
  codepointInfo,
  type WordOptions,
  type BitGrouping,
  type FloatWidth,
} from '../../../engine/programmer';
import { BitGrid } from './BitGrid';
import './ProgrammerPanel.css';
const bases = [
  ['bin', 2],
  ['oct', 8],
  ['dec', 10],
  ['hex', 16],
] as const;
function BaseRow({
  base,
  label,
  value,
  onSubmit,
  copy,
  locale,
}: {
  locale: Locale;
  base: number;
  label: string;
  value: string;
  onSubmit: (source: string, base: number) => void;
  copy: (text: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const submit = () => {
    if (draft !== null) {
      onSubmit(draft, base);
      setDraft(null);
    }
  };
  return (
    <div className="programmer-base-row">
      <TextField
        label={label}
        value={draft ?? value}
        onChange={setDraft}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') setDraft(null);
        }}
      />
      <Button
        variant="text"
        aria-label={label + ' · ' + t('programmer.apply', locale)}
        onPress={submit}
      >
        {t('programmer.apply', locale)}
      </Button>
      <Button
        variant="text"
        aria-label={label + ' · ' + t('scientific.copyText', locale)}
        onPress={() => copy(value)}
      >
        {t('scientific.copyText', locale)}
      </Button>
    </div>
  );
}
export function ProgrammerPanel({
  value,
  options,
  locale,
  onRun,
  onConfigure,
  copy,
}: {
  value: bigint;
  options: WordOptions;
  locale: Locale;
  onRun: (source: string) => void;
  onConfigure: (options: WordOptions) => void;
  copy: (text: string) => void;
}) {
  const [grouping, setGrouping] = useState<BitGrouping>('none'),
    [base, setBase] = useState('36'),
    [operand, setOperand] = useState('1'),
    [draftBits, setDraftBits] = useState<bigint | null>(null),
    [error, setError] = useState(false);
  const submit = (source: string, radix: number) => {
    try {
      const v = parseBase(source, radix, options);
      setError(false);
      onRun(v.toString());
    } catch {
      setError(true);
    }
  };
  const expression = (op: string) => {
    setError(false);
    const a = value.toString(),
      b = operand;
    onRun(
      op === 'not'
        ? '~(' + a + ')'
        : op === 'and' || op === 'or' || op === 'shl' || op === 'shr'
          ? '(' +
            a +
            ') ' +
            { and: '&', or: '|', shl: '<<', shr: '>>' }[op] +
            ' (' +
            b +
            ')'
          : op +
            '(' +
            a +
            (['bswap', 'popcount', 'clz', 'ctz'].includes(op) ? '' : ', ' + b) +
            ')',
    );
  };
  return (
    <section
      className="programmer-panel"
      aria-label={t('scientific.computerScience', locale)}
    >
      <h2>{t('scientific.computerScience', locale)}</h2>
      <p className="scientific-help">{t('programmer.hint', locale)}</p>
      <div className="programmer-controls">
        <div>
          <p className="scientific-control-label">
            {t('programmer.width', locale)}
          </p>
          <SegmentedControl
            aria-label={t('programmer.width', locale)}
            value={String(options.width)}
            onChange={(v) =>
              onConfigure({
                ...options,
                width: Number(v) as WordOptions['width'],
              })
            }
            items={[8, 16, 32, 64].map((v) => ({
              id: String(v),
              label: String(v),
            }))}
          />
        </div>
        <div>
          <p className="scientific-control-label">
            {t('programmer.signMode', locale)}
          </p>
          <SegmentedControl
            aria-label={t('programmer.signMode', locale)}
            value={options.signed ? 'signed' : 'unsigned'}
            onChange={(v) =>
              onConfigure({ ...options, signed: v === 'signed' })
            }
            items={(['unsigned', 'signed'] as const).map((id) => ({
              id,
              label: t(`programmer.${id}`, locale),
            }))}
          />
        </div>
        <div>
          <p className="scientific-control-label">
            {t('programmer.overflow', locale)}
          </p>
          <SegmentedControl
            aria-label={t('programmer.overflow', locale)}
            value={options.overflow}
            onChange={(v) =>
              onConfigure({
                ...options,
                overflow: v as WordOptions['overflow'],
              })
            }
            items={(['wrap', 'error'] as const).map((id) => ({
              id,
              label: t(`programmer.${id}`, locale),
            }))}
          />
        </div>
      </div>
      <div className="programmer-word-grid">
        <BitGrid
          width={options.width}
          bits={draftBits ?? value & ((1n << BigInt(options.width)) - 1n)}
          locale={locale}
          onChange={setDraftBits}
          onCommit={(bits) => {
            onRun(fromBits(bits, options).toString());
            setDraftBits(null);
          }}
        />
      </div>
      <SegmentedControl
        aria-label={t('programmer.grouping', locale)}
        value={grouping}
        onChange={(v) => setGrouping(v as BitGrouping)}
        items={(['none', 'nibble', 'byte'] as const).map((id) => ({
          id,
          label: t(`programmer.${id}`, locale),
        }))}
      />
      <div className="programmer-bases">
        {bases.map(([id, radix]) => (
          <BaseRow
            locale={locale}
            key={id + value + options.width + options.signed}
            base={radix}
            label={t(`programmer.${id}`, locale)}
            value={formatBase(value, radix, options, grouping)}
            onSubmit={submit}
            copy={copy}
          />
        ))}
      </div>
      <div className="programmer-arbitrary">
        <TextField
          label={t('programmer.base', locale)}
          value={base}
          onChange={setBase}
        />
        {Number(base) >= 2 &&
        Number(base) <= 36 &&
        Number.isInteger(Number(base)) ? (
          <BaseRow
            locale={locale}
            key={base + value}
            base={Number(base)}
            label={t('programmer.baseValue', locale)}
            value={formatBase(value, Number(base), options, grouping)}
            onSubmit={submit}
            copy={copy}
          />
        ) : (
          <p role="alert">{t('programmer.invalid', locale)}</p>
        )}
      </div>
      <TextField
        label={t('programmer.operand', locale)}
        value={operand}
        onChange={setOperand}
      />
      <div className="programmer-operations">
        {(
          [
            'and',
            'or',
            'xor',
            'not',
            'shl',
            'shr',
            'rol',
            'ror',
            'nand',
            'nor',
            'xnor',
            'lsr',
            'asr',
            'bswap',
            'popcount',
            'clz',
            'ctz',
          ] as const
        ).map((op) => (
          <Button key={op} variant="tonal" onPress={() => expression(op)}>
            {t(('programmer.op.' + op) as MessageKey, locale)}
          </Button>
        ))}
      </div>
      {error && (
        <p className="scientific-error" role="alert">
          {t('programmer.invalid', locale)}
        </p>
      )}
      <IEEEView locale={locale} copy={copy} />
      <CharacterView locale={locale} />
    </section>
  );
}
function IEEEView({
  locale,
  copy,
}: {
  locale: Locale;
  copy: (text: string) => void;
}) {
  const [width, setWidth] = useState<FloatWidth>(32),
    [bits, setBits] = useState(0n),
    [numeric, setNumeric] = useState('0'),
    [hex, setHex] = useState('0'),
    [error, setError] = useState(false);
  const parts = floatFromBits(bits, width);
  const update = (next: bigint) => {
    setBits(next);
    setNumeric(String(floatFromBits(next, width).value));
    setHex(
      next
        .toString(16)
        .toUpperCase()
        .padStart(width / 4, '0'),
    );
    setError(false);
  };
  const guard = (f: () => void) => {
    try {
      f();
      setError(false);
    } catch {
      setError(true);
    }
  };
  const numericSubmit = () =>
    guard(() => {
      if (
        !numeric.trim() ||
        (!['NaN', 'Infinity', '-Infinity', '+Infinity'].includes(
          numeric.trim(),
        ) &&
          !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(numeric.trim()))
      )
        throw Error();
      update(floatToBits(Number(numeric), width));
    });
  return (
    <section
      className="programmer-ieee"
      aria-label={t('programmer.ieee', locale)}
    >
      <h3>{t('programmer.ieee', locale)}</h3>
      <SegmentedControl
        aria-label={t('programmer.floatWidth', locale)}
        value={String(width)}
        onChange={(v) => {
          const w = Number(v) as FloatWidth;
          setWidth(w);
          const next = floatToBits(parts.value, w);
          setBits(next);
          setHex(
            next
              .toString(16)
              .toUpperCase()
              .padStart(w / 4, '0'),
          );
          setNumeric(String(floatFromBits(next, w).value));
          setError(false);
        }}
        items={[32, 64].map((v) => ({
          id: String(v),
          label: t(
            v === 32 ? 'programmer.float32' : 'programmer.float64',
            locale,
          ),
        }))}
      />
      <TextField
        label={t('programmer.floatValue', locale)}
        value={numeric}
        onChange={setNumeric}
        onKeyDown={(e) => {
          if (e.key === 'Enter') numericSubmit();
        }}
      />
      <Button variant="outlined" onPress={numericSubmit}>
        {t('programmer.apply', locale)}
      </Button>
      <TextField
        label={t('programmer.floatHex', locale)}
        value={hex}
        onChange={setHex}
        onKeyDown={(e) => {
          if (e.key === 'Enter')
            guard(() => {
              const next = parseBase(hex, 16, {
                width,
                signed: false,
                overflow: 'error',
              });
              floatFromBits(next, width);
              update(next);
            });
        }}
      />
      <BitGrid
        width={width}
        bits={bits}
        float
        locale={locale}
        onChange={update}
        onCommit={update}
      />
      <div className="programmer-float-fields">
        <span data-field="sign">
          {t('programmer.sign', locale)}: {parts.sign}
        </span>
        <span data-field="exponent">
          {t('programmer.exponent', locale)}: {parts.exponent}
        </span>
        <span data-field="mantissa">
          {t('programmer.mantissa', locale)}: {parts.mantissa.toString()}
        </span>
      </div>
      <div className="programmer-field-inputs">
        {(['sign', 'exponent', 'mantissa'] as const).map((field) => (
          <TextField
            key={field + bits + width}
            label={t(`programmer.field.${field}`, locale)}
            defaultValue={String(parts[field])}
            onKeyDown={(e) => {
              if (e.key === 'Enter')
                guard(() => {
                  const target = e.target;
                  if (
                    !(target instanceof HTMLInputElement) ||
                    !/^\d+$/.test(target.value)
                  )
                    throw Error();
                  const raw = target.value;
                  update(
                    composeFloat(
                      field === 'sign' ? Number(raw) : parts.sign,
                      field === 'exponent' ? Number(raw) : parts.exponent,
                      field === 'mantissa' ? BigInt(raw) : parts.mantissa,
                      width,
                    ),
                  );
                });
            }}
          />
        ))}
      </div>
      <p>
        {t('programmer.class', locale)}:{' '}
        {t(('programmer.class.' + parts.kind) as MessageKey, locale)}
      </p>
      <output
        className="programmer-exact"
        aria-label={t('programmer.exact', locale)}
      >
        {parts.exact}
      </output>
      <Button variant="text" onPress={() => copy(parts.exact)}>
        {t('programmer.copyExact', locale)}
      </Button>
      {error && (
        <p role="alert" className="scientific-error">
          {t('programmer.invalid', locale)}
        </p>
      )}
    </section>
  );
}
function CharacterView({ locale }: { locale: Locale }) {
  const [character, setCharacter] = useState('A'),
    [codepoint, setCodepoint] = useState('65'),
    [error, setError] = useState(false);
  let bytes = '';
  try {
    bytes = characterInfo(character)
      .bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');
  } catch {
    /* Keep invalid input editable. */
  }
  return (
    <section className="programmer-character">
      <h3>{t('programmer.characters', locale)}</h3>
      <TextField
        label={t('programmer.character', locale)}
        value={character}
        onChange={(v) => {
          setCharacter(v);
          try {
            setCodepoint(String(characterInfo(v).codepoint));
            setError(false);
          } catch {
            setError(true);
          }
        }}
      />
      <TextField
        label={t('programmer.codepoint', locale)}
        value={codepoint}
        onChange={(v) => {
          setCodepoint(v);
          try {
            if (!/^(?:\d+|0x[0-9a-f]+)$/i.test(v)) throw Error();
            setCharacter(codepointInfo(Number(v)).character);
            setError(false);
          } catch {
            setError(true);
          }
        }}
      />
      <output className="programmer-utf8">
        {t('programmer.utf8', locale)}: {bytes}
      </output>
      {error && (
        <p role="alert" className="scientific-error">
          {t('programmer.invalidCharacter', locale)}
        </p>
      )}
    </section>
  );
}
