import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { execute } from '../src/engine';
import { defaultSettings } from '../src/shared/settings';
import { emptyHistory } from '../src/shared/history';
import { t } from '../src/shared/i18n/extended';
import { currencyCodes } from '../src/units/currency';
import { ready, tabTo } from './qa-setup';
import { checkSettingsFocus } from './settingsFocus';

test.use({ serviceWorkers: 'block' });

for (const locale of ['de', 'en'] as const) {
  test.describe(`WP-10 ${locale}`, () => {
    test.use({ locale: locale === 'de' ? 'de-DE' : 'en-US' });

    test('reset preserves feature data and offline files', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto('/m8e-calc/#/simple');
      await ready(page, 'simple');
      const result = execute('kept=42');
      if (!result.ok) throw new Error('Definition fixture failed');
      const preserved = {
        'm8e-calc.scientific': JSON.stringify({
          version: 1,
          state: { environment: result.value.environment },
        }),
        'm8e-calc.convert': JSON.stringify({
          version: 1,
          state: {
            favorites: [{ categoryId: 'length', fromId: 'km', toId: 'mi' }],
            recent: [{ categoryId: 'length', fromId: 'm', toId: 'km' }],
            digits: 50,
            notation: 'eng',
            compound: true,
            sort: 'size',
          },
        }),
        'm8e-calc.currency-rates': JSON.stringify({
          version: 1,
          source: 'ecb-frankfurter',
          date: '2026-10-14',
          fetchedAt: Date.parse('2026-10-14T16:00:00Z'),
          rates: Object.fromEntries(currencyCodes.map((code) => [code, '1'])),
        }),
        'm8e-calc.currency-rates.last-attempt': String(
          Date.parse('2026-10-14T16:00:00Z'),
        ),
        'm8e-calc.future': 'not implicitly part of this reset',
      };
      const settings = {
        ...defaultSettings(),
        language: locale,
        historyLimit: 17,
        grouping: false,
        onlineRates: true,
        motionLevel: 'off',
      };
      const modes = ['simple', 'scientific', 'convert', 'graph'] as const;
      const history = {
        ...emptyHistory(),
        limit: 17,
        entries: modes.map((mode) => ({
          id: `wp10-${mode}`,
          mode,
          ts: 1,
          input: '1+1',
          result: '2',
          pinned: true,
          payload: null,
        })),
      };
      await page.evaluate(
        async ({ preserved, settings, history }) => {
          for (const [key, value] of Object.entries(preserved))
            localStorage.setItem(key, value);
          localStorage.setItem(
            'm8e-calc.settings',
            JSON.stringify({ version: 4, state: settings }),
          );
          localStorage.setItem(
            'm8e-calc.history',
            JSON.stringify({ version: 1, state: history }),
          );
          const cache = await caches.open('m8e-calc.wp10-retained');
          await cache.put(
            '/m8e-calc/wp10-retained',
            new Response('offline file'),
          );
        },
        { preserved, settings, history },
      );
      await page.reload();
      await ready(page, 'simple');
      const opener = page.getByRole('button', {
        name: t('shell.settings', locale),
        exact: true,
      });
      await opener.click();
      const dialog = page.getByRole('dialog', {
        name: t('shell.settings', locale),
        exact: true,
      });
      const trigger = dialog.getByRole('button', {
        name: t('settings.reset', locale),
        exact: true,
      });
      await tabTo(page, trigger);
      await page.keyboard.press('Enter');
      const confirm = dialog.getByRole('region', {
        name: t('settings.resetTitle', locale),
      });
      await expect(confirm).toContainText(t('settings.resetHint', locale));
      const cancel = confirm.getByRole('button', {
        name: t('settings.cancel', locale),
      });
      await tabTo(page, cancel);
      await page.keyboard.press('Enter');
      await expect(trigger).toBeFocused();
      expect(
        await page.evaluate(
          () =>
            JSON.parse(localStorage.getItem('m8e-calc.history') ?? 'null')
              .state,
        ),
      ).toEqual(history);
      await page.keyboard.press('Enter');
      await tabTo(
        page,
        confirm.getByRole('button', {
          name: t('settings.reset', locale),
          exact: true,
        }),
      );
      await page.keyboard.press('Enter');
      await expect(confirm).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect(
        page.getByText(t('settings.resetDone', locale), { exact: true }),
      ).toBeVisible();
      const actual = await page.evaluate(async (keys) => {
        const offline = await (
          await caches.open('m8e-calc.wp10-retained')
        ).match('/m8e-calc/wp10-retained');
        return {
          settings: JSON.parse(
            localStorage.getItem('m8e-calc.settings') ?? 'null',
          ).state,
          history: JSON.parse(
            localStorage.getItem('m8e-calc.history') ?? 'null',
          ).state,
          app: JSON.parse(localStorage.getItem('m8e-calc.app') ?? 'null').state,
          preserved: Object.fromEntries(
            keys.map((key) => [key, localStorage.getItem(key)]),
          ),
          offline: await offline?.text(),
        };
      }, Object.keys(preserved));
      expect(actual.settings).toEqual(defaultSettings());
      expect(actual.history).toEqual(emptyHistory());
      expect(actual.app).toEqual({ lastMode: 'simple' });
      expect(actual.preserved).toEqual(preserved);
      expect(actual.offline).toBe('offline file');
      await tabTo(
        page,
        dialog.getByRole('button', {
          name: t('ui.close', locale),
          exact: true,
        }),
      );
      await page.keyboard.press('Enter');
      await expect(opener).toBeFocused();
      await page.reload();
      await ready(page, 'simple');
      expect(
        await page.evaluate(
          (keys) =>
            Object.fromEntries(
              keys.map((key) => [key, localStorage.getItem(key)]),
            ),
          Object.keys(preserved),
        ),
      ).toEqual(preserved);
    });

    for (const theme of ['light', 'dark'] as const) {
      test(`${theme}: fixed header and keyboard at 200% reflow`, async ({
        page,
      }, info) => {
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: 'reduce',
        });
        await page.addInitScript(
          ({ locale, theme }) =>
            localStorage.setItem(
              'm8e-calc.settings',
              JSON.stringify({
                version: 4,
                state: {
                  language: locale,
                  themeMode: theme,
                  motionLevel: theme === 'light' ? 'off' : 'reduced',
                  uiSize: 150,
                },
              }),
            ),
          { locale, theme },
        );
        // Cross-engine CSS reflow supplements, never replaces, native tab zoom.
        await page.setViewportSize({ width: 640, height: 450 });
        await page.goto('/m8e-calc/#/simple');
        await ready(page, 'simple');
        const opener = page.getByRole('button', {
          name: t('shell.settings', locale),
          exact: true,
        });
        await opener.click();
        const dialog = page.getByRole('dialog', {
          name: t('shell.settings', locale),
          exact: true,
        });
        const samples = await checkSettingsFocus(page, dialog);
        await info.attach('settings-focus', {
          body: JSON.stringify(samples),
          contentType: 'application/json',
        });
        const axe = await new AxeBuilder({ page })
          .options({
            rules: { 'label-content-name-mismatch': { enabled: true } },
          })
          .analyze();
        expect(axe.violations).toEqual([]);
        await info.attach('settings-reflow', {
          body: await page.screenshot(),
          contentType: 'image/png',
        });
        await page.keyboard.press('Escape');
        await expect(opener).toBeFocused();
      });
    }
  });
}
