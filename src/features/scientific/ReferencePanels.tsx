import { useState } from 'react';
import { Button } from '../../ui/Button';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { TextField } from '../../ui/TextField';
import { constantRegistry, type Environment } from '../../engine';
import { t, type Locale } from '../../shared/i18n/extended';
import { constantMatches, definitionSource } from './model';
export function ConstantsPanel({
  locale,
  insert,
  copy,
}: {
  locale: Locale;
  insert: (text: string) => void;
  copy: (text: string) => void;
}) {
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all');
  const constants = Object.values(constantRegistry).filter((c) =>
    constantMatches(c.id, c.name[locale], c.symbol, query, filter),
  );
  return (
    <section
      className="scientific-reference scientific-constants"
      aria-label={t('scientific.constants', locale)}
    >
      <h2>{t('scientific.constants', locale)}</h2>
      <TextField
        label={t('scientific.searchConstants', locale)}
        value={query}
        onChange={setQuery}
      />
      <SegmentedControl
        aria-label={t('scientific.filter', locale)}
        value={filter}
        onChange={setFilter}
        items={['all', 'math', 'physics'].map((id) => ({
          id,
          label: t(`scientific.${id as 'all' | 'math' | 'physics'}`, locale),
        }))}
      />
      <ul className="scientific-constant-list">
        {constants.map((c) => (
          <li key={c.id}>
            <Button
              variant="text"
              className="scientific-constant-insert"
              title={t('scientific.insert', locale, { text: c.id })}
              onPress={() => insert(c.id)}
            >
              <span className="scientific-constant-symbol">{c.symbol}</span>
              <span>
                <strong>{c.name[locale]}</strong>
                <small>
                  {c.value} {c.unit}
                </small>
                <small>{c.id}</small>
              </span>
            </Button>
            <Button
              variant="text"
              aria-label={`${t('scientific.copyText', locale)}: ${c.name[locale]}`}
              onPress={() => copy(c.value)}
            >
              {t('scientific.copyText', locale)}
            </Button>
          </li>
        ))}
      </ul>
      {!constants.length && <p>{t('scientific.noConstants', locale)}</p>}
    </section>
  );
}
export function VariablesPanel({
  locale,
  environment,
  insert,
  edit,
  remove,
}: {
  locale: Locale;
  environment: Environment;
  insert: (name: string) => void;
  edit: (source: string) => void;
  remove: (name: string) => void;
}) {
  const names = [
    ...Object.keys(environment.variables),
    ...Object.keys(environment.functions),
  ].sort();
  return (
    <section
      className="scientific-reference scientific-variables"
      aria-label={t('scientific.variables', locale)}
    >
      <h2>{t('scientific.variables', locale)}</h2>
      {!names.length && <p>{t('scientific.noVariables', locale)}</p>}
      <ul className="scientific-variable-list">
        {names.map((name) => (
          <li key={name}>
            <Button
              variant="text"
              className="scientific-definition"
              aria-label={t('scientific.insert', locale, { text: name })}
              onPress={() =>
                insert(environment.functions[name] ? `${name}(` : name)
              }
            >
              {definitionSource(environment, name)}
            </Button>
            <div>
              <Button
                variant="text"
                aria-label={t('scientific.edit', locale, { name })}
                onPress={() => edit(definitionSource(environment, name))}
              >
                {t('scientific.edit', locale, { name })}
              </Button>
              <Button
                variant="text"
                aria-label={t('scientific.delete', locale, { name })}
                onPress={() => remove(name)}
              >
                {t('scientific.delete', locale, { name })}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
