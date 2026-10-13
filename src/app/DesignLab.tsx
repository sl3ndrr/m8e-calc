import type { CSSProperties } from 'react';
import { useAppStore } from '../shared/store';
import { useSettingsStore } from '../shared/settingsStore';
import { motionLevels, resolveDark } from '../shared/settings';
import { t } from '../shared/i18n';
import { buildScheme, colorRoles, roleProperty } from '../styles/buildScheme';
import { typeScale } from '../styles/typeScale';
import { shapes } from '../styles/shapes';
import { springs, type SpringName } from '../styles/motion';
import { MotionDemo } from '../ui/MotionDemo';
import { useSystemDark } from './theme';
export function DesignLab() {
  const locale = useAppStore((state) => state.locale);
  const settings = useSettingsStore();
  const palette = buildScheme(
    settings.accent,
    settings.schemeVariant,
    resolveDark(settings.themeMode, useSystemDark()),
    settings.contrast,
  );
  return (
    <div className="design-lab">
      <header className="design-hero">
        <p className="eyebrow">{t('design.eyebrow', locale)}</p>
        <h1>{t('design.title', locale)}</h1>
        <p>{t('design.intro', locale)}</p>
        <div className="hero-palette" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </header>
      <section className="lab-section" aria-labelledby="type-title">
        <div className="section-heading">
          <span className="section-number" aria-hidden="true">
            01
          </span>
          <h2 id="type-title">{t('design.type', locale)}</h2>
        </div>
        <div className="type-headings">
          <span>{t('design.baseline', locale)}</span>
          <span>{t('design.emphasized', locale)}</span>
        </div>
        <div className="type-scale">
          {typeScale.map(([name, size]) => (
            <div className="type-row" key={name}>
              <code>
                {name} · {size}
              </code>
              <div className={`type-${name}`}>{t('design.sample', locale)}</div>
              <div className={`type-${name}-emphasized`}>
                {t('design.sample', locale)}
              </div>
            </div>
          ))}
        </div>
        <div className="expression-sample">
          <span>{t('design.expression', locale)}</span>
          <p className="expression">{t('design.expressionSample', locale)}</p>
        </div>
      </section>
      <section className="lab-section" aria-labelledby="shapes-title">
        <div className="section-heading">
          <span className="section-number" aria-hidden="true">
            02
          </span>
          <h2 id="shapes-title">{t('design.shapes', locale)}</h2>
        </div>
        <div className="shape-grid">
          {Object.entries(shapes).map(([name, size]) => (
            <div key={name}>
              <div className={`shape-sample shape-${name}`} />
              <span>{t(`shape.${name as keyof typeof shapes}`, locale)}</span>
              <code>{name === 'full' ? '∞' : `${size}px`}</code>
            </div>
          ))}
        </div>
      </section>
      <section className="lab-section" aria-labelledby="motion-title">
        <div className="section-heading">
          <span className="section-number" aria-hidden="true">
            03
          </span>
          <h2 id="motion-title">{t('design.motion', locale)}</h2>
        </div>
        <p>{t('design.motionHint', locale)}</p>
        <div className="field motion-setting">
          <label htmlFor="motion-level">
            {t('design.motionLevel', locale)}
          </label>
          <select
            id="motion-level"
            value={settings.motionLevel}
            onChange={(event) => {
              const motionLevel = motionLevels.find(
                (item) => item === event.target.value,
              );
              if (motionLevel) settings.updateSettings({ motionLevel });
            }}
          >
            {motionLevels.map((item) => (
              <option key={item} value={item}>
                {t(`motion.${item}`, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className="motion-grid">
          {(Object.keys(springs) as SpringName[]).map((name) => (
            <MotionDemo key={name} name={name} />
          ))}
        </div>
      </section>
      <section className="lab-section" aria-labelledby="colors-title">
        <div className="section-heading">
          <span className="section-number" aria-hidden="true">
            04
          </span>
          <h2 id="colors-title">{t('design.colors', locale)}</h2>
        </div>
        <div className="role-table-wrap">
          <table className="role-table">
            <thead>
              <tr>
                <th scope="col">{t('design.role', locale)}</th>
                <th scope="col">{t('design.value', locale)}</th>
                <th scope="col">{t('design.swatch', locale)}</th>
              </tr>
            </thead>
            <tbody>
              {colorRoles.map((role) => (
                <tr key={role}>
                  <th scope="row">
                    <code>{roleProperty(role)}</code>
                  </th>
                  <td>
                    <code>{palette[roleProperty(role)]}</code>
                  </td>
                  <td>
                    <span
                      className="role-swatch"
                      style={
                        {
                          '--md-sys-color-swatch': palette[roleProperty(role)],
                        } as CSSProperties
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
