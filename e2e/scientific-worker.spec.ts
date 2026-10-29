import { test, expect, type Page } from '@playwright/test';
import { cpus, platform, release } from 'node:os';
import { t } from '../src/shared/i18n/extended';
import { qaSetup, ready } from './qa-setup';
import { installScientificWorkerProbe } from './scientificWorkerProbe';

const heavy = 'sum(integral(sin(x),x,0,pi),k,1,100)';
async function snapshot(page: Page) {
  return page.evaluate(() => ({
    environment: JSON.parse(
      localStorage.getItem('m8e-calc.scientific') ?? 'null',
    )?.state.environment,
    history:
      JSON.parse(localStorage.getItem('m8e-calc.history') ?? 'null')?.state
        .entries ?? [],
  }));
}
async function started(page: Page, kind: 'preview' | 'execute', after = 0) {
  await expect
    .poll(() =>
      page.evaluate(
        ({ kind, after }) => {
          const p = window.__scientificWorkerProbe;
          return p.posts.some(
            (r) => r.id > after && r.kind === kind && p.started.includes(r.id),
          );
        },
        { kind, after },
      ),
    )
    .toBe(true);
  return page.evaluate(
    ({ kind, after }) => {
      const p = window.__scientificWorkerProbe;
      const r = [...p.posts]
        .reverse()
        .find(
          (r) => r.id > after && r.kind === kind && p.started.includes(r.id),
        );
      if (!r) throw new Error('Expected started production worker');
      return r.id;
    },
    { kind, after },
  );
}
test.describe('WP-07 production worker races', () => {
  test.use({ serviceWorkers: 'block' });
  for (const [locale, width] of [
    ['de', 1440],
    ['en', 3840],
  ] as const) {
    test.describe(locale, () => {
      test.beforeEach(async ({ page }) => {
        await qaSetup(page, 'light', '#6750a4', locale);
        await page.setViewportSize({ width, height: 1080 });
        await installScientificWorkerProbe(page);
        await page.goto('/m8e-calc/#/scientific');
        await ready(page, 'scientific');
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
      });
      test(`${locale}: expensive value, editable pending UI, navigation and cleanup before final delivery`, async ({
        page,
        browser,
      }, info) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        const editor = page.getByRole('textbox', {
          name: t('scientific.expression', locale),
        });
        const rad = page.getByRole('radio', { name: 'RAD', exact: true });
        await rad.focus();
        await rad.press('Space');
        await page.evaluate(() => window.__scientificWorkerProbe.release());
        await editor.fill(heavy);
        await editor.press('Enter');
        await expect(page.locator('.scientific-result-text')).toHaveText('200');
        const before = await snapshot(page);
        expect(before.history).toHaveLength(1);
        expect(before.environment.history[0]).toEqual({
          kind: 'number',
          value: '200.00000000000000000000000007193949273708873248005',
        });
        await page.evaluate(() => {
          window.__scientificWorkerProbe.hold = true;
        });
        const last = await page.evaluate(
          () => window.__scientificWorkerProbe.posts.at(-1)?.id ?? 0,
        );
        await editor.press('Enter');
        await started(page, 'execute', last);
        // This is deliberately before releasing or awaiting the final worker response.
        await editor.fill('123+456');
        await expect(editor).toHaveText('123+456');
        expect(await snapshot(page)).toEqual(before);
        await page.locator('.ui-navigation-rail a[href="#/simple"]').click();
        await ready(page, 'simple');
        await page.keyboard.type('2+3=');
        await expect(page.locator('.calculator-announcement')).toHaveText('5');
        await expect
          .poll(() =>
            page.evaluate(() => window.__scientificWorkerProbe.active),
          )
          .toBe(0);
        await page.evaluate(() => window.__scientificWorkerProbe.release());
        const after = await snapshot(page);
        expect(after.environment).toEqual(before.environment);
        expect(
          after.history.filter(
            (entry: { mode: string }) => entry.mode === 'scientific',
          ),
        ).toHaveLength(1);
        const metrics = await page.evaluate(() => {
          const p = window.__scientificWorkerProbe;
          return {
            created: p.created,
            terminated: p.terminated,
            active: p.active,
            maxActive: p.maxActive,
            csp: p.csp,
          };
        });
        expect(metrics.created).toBe(metrics.terminated);
        expect(metrics.maxActive).toBe(1);
        expect(metrics.csp).toEqual([]);
        expect(errors).toEqual([]);
        await info.attach('wp07-runtime', {
          contentType: 'application/json',
          body: JSON.stringify({
            node: process.version,
            browser: browser.version(),
            locale,
            width,
            metrics,
            runner: {
              platform: platform(),
              release: release(),
              cpu: cpus()[0]?.model,
              cpus: cpus().length,
            },
            note: 'Controlled pending-response functional case; no physical device or performance acceptance.',
          }),
        });
      });
      test(`${locale}: A → B → A previews, options, double Enter, keyboard cancel and failure`, async ({
        page,
      }) => {
        const editor = page.getByRole('textbox', {
          name: t('scientific.expression', locale),
        });
        const baseline = await snapshot(page);
        let last = 0;
        for (const source of ['1+2', '2+3', '1+2']) {
          await editor.fill(source);
          last = await started(page, 'preview', last);
        }
        await expect
          .poll(() =>
            page.evaluate(
              (id) => window.__scientificWorkerProbe.replies.includes(id),
              last,
            ),
          )
          .toBe(true);
        await page.evaluate(() => window.__scientificWorkerProbe.release());
        await expect(page.locator('.scientific-preview')).toContainText('3');
        expect(await snapshot(page)).toEqual(baseline);
        await page.evaluate(() => {
          window.__scientificWorkerProbe.hold = true;
        });
        await editor.fill('sin(30)');
        last = await started(page, 'preview', last);
        const rad = page.getByRole('radio', { name: 'RAD', exact: true });
        await rad.focus();
        await rad.press('Space');
        last = await started(page, 'preview', last);
        const on = page.getByRole('radio', {
          name: t('scientific.on', locale),
          exact: true,
        });
        await on.focus();
        await on.press('Space');
        last = await started(page, 'preview', last);
        await expect
          .poll(() =>
            page.evaluate(
              (id) => window.__scientificWorkerProbe.replies.includes(id),
              last,
            ),
          )
          .toBe(true);
        await page.evaluate(() => window.__scientificWorkerProbe.release());
        await expect(page.locator('.scientific-preview')).toContainText(
          locale === 'de' ? '-0,988031624092862' : '-0.988031624092862',
        );
        expect(await snapshot(page)).toEqual(baseline);
        await page.evaluate(() => {
          window.__scientificWorkerProbe.hold = true;
        });
        await editor.fill('7');
        await editor.press('Enter');
        last = await started(page, 'execute', last);
        await editor.fill('8');
        await editor.press('Enter');
        last = await started(page, 'execute', last);
        await expect
          .poll(() =>
            page.evaluate(
              (id) => window.__scientificWorkerProbe.replies.includes(id),
              last,
            ),
          )
          .toBe(true);
        await page.evaluate(() => window.__scientificWorkerProbe.release());
        await expect(page.locator('.scientific-result-text')).toHaveText('8');
        expect((await snapshot(page)).history).toHaveLength(1);
        await page.evaluate(() => {
          window.__scientificWorkerProbe.hold = true;
        });
        await editor.fill('9');
        await editor.press('Enter');
        last = await started(page, 'execute', last);
        const cancel = page.getByRole('button', {
          name: t('scientific.work.cancel', locale),
          exact: true,
        });
        await cancel.focus();
        await cancel.press('Enter');
        await expect(editor).toBeFocused();
        await page.evaluate(() => window.__scientificWorkerProbe.release());
        expect((await snapshot(page)).history).toHaveLength(1);
        await expect(page.locator('.scientific-preview')).toHaveText(
          t('scientific.work.cancelled', locale),
        );
        await page.evaluate(() => {
          window.__scientificWorkerProbe.hold = true;
        });
        await editor.press('Enter');
        await started(page, 'execute', last);
        await page.evaluate(() => window.__scientificWorkerProbe.fail());
        await expect(page.getByRole('alert')).toHaveText(
          t('scientific.work.failed', locale),
        );
        await editor.press('Escape');
        await expect(editor).toHaveText('');
        expect((await snapshot(page)).history).toHaveLength(1);
        await expect
          .poll(() =>
            page.evaluate(() => window.__scientificWorkerProbe.active),
          )
          .toBe(0);
      });
      test(`${locale}: deleting a definition invalidates a held explicit environment`, async ({
        page,
      }) => {
        const editor = page.getByRole('textbox', {
          name: t('scientific.expression', locale),
        });
        await page.evaluate(() => window.__scientificWorkerProbe.release());
        await editor.fill('a=5');
        await editor.press('Enter');
        await expect(page.locator('.scientific-result-text')).toHaveText('5');
        await page.evaluate(() => {
          window.__scientificWorkerProbe.hold = true;
        });
        await editor.fill('a+1');
        await editor.press('Enter');
        await started(page, 'execute', 1);
        if (width < 1920) {
          const variables = page.getByRole('radio', {
            name: t('scientific.variables', locale),
            exact: true,
          });
          await variables.focus();
          await variables.press('Space');
        }
        const remove = page.getByRole('button', {
          name: t('scientific.delete', locale, { name: 'a' }),
          exact: true,
        });
        await remove.focus();
        await remove.press('Enter');
        await expect(remove).toHaveCount(0);
        await page.evaluate(() => window.__scientificWorkerProbe.release());
        const after = await snapshot(page);
        expect(after.environment.variables.a).toBeUndefined();
        expect(after.history).toHaveLength(1);
        await editor.press('Escape');
      });
    });
  }
});

test('WP-07 fresh simple precache starts scientific calculation offline with local worker and CSP', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await installScientificWorkerProbe(page);
  await page.goto('/m8e-calc/#/simple');
  await ready(page, 'simple');
  await page.evaluate(() => window.__scientificWorkerProbe.release());
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => resolve(),
          { once: true },
        ),
      );
  });
  const workers = await page.evaluate(async () => {
    const paths = (
      await Promise.all(
        (await caches.keys()).map(async (name) =>
          (await (await caches.open(name)).keys()).map((r) => r.url),
        ),
      )
    ).flat();
    return paths.filter((path) => path.includes('calculation.worker'));
  });
  expect(workers).toHaveLength(1);
  await context.setOffline(true);
  await page.locator('.ui-navigation-rail a[href="#/scientific"]').click();
  await ready(page, 'scientific');
  const editor = page.getByRole('textbox', {
    name: t('scientific.expression'),
  });
  await editor.fill('integral(x^2,x,0,3)');
  await editor.press('Enter');
  await expect(page.locator('.scientific-result-text')).toHaveText('9');
  await page.reload();
  await ready(page, 'scientific');
  await page.evaluate(() => window.__scientificWorkerProbe.release());
  await editor.fill('ans+1');
  await editor.press('Enter');
  await expect(page.locator('.scientific-result-text')).toHaveText('10');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => window.__scientificWorkerProbe.csp)).toEqual(
    [],
  );
});
