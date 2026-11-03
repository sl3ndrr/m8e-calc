import { readFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createEnvironment, execute, type Environment } from '../src/engine';
import { t, type Locale } from '../src/shared/i18n/extended';
import {
  exportDefinitionBackup,
  MAX_DEFINITION_FILE_BYTES,
} from '../src/features/scientific/definitionBackup';
import { qaSetup, ready, tabTo } from './qa-setup';
import { installScientificWorkerProbe } from './scientificWorkerProbe';

function step(source: string, environment = createEnvironment()): Environment {
  const result = execute(source, environment, { complex: 'on' });
  if (!result.ok) throw new Error(result.error.code);
  return result.value.environment;
}
async function seed(page: Page, environment: Environment | string) {
  await page.addInitScript((environment) => {
    if (sessionStorage.getItem('wp12-seeded')) return;
    localStorage.setItem(
      'm8e-calc.scientific',
      typeof environment === 'string'
        ? environment
        : JSON.stringify({ state: { environment }, version: 1 }),
    );
    sessionStorage.setItem('wp12-seeded', '1');
  }, environment);
}
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('m8e-calc.scientific');
    return {
      raw,
      environment: JSON.parse(raw ?? 'null')?.state.environment as Environment,
      globalHistory: localStorage.getItem('m8e-calc.history'),
    };
  });
}
async function openBackup(page: Page, locale: Locale) {
  const variables = page.getByRole('radio', {
    name: t('scientific.variables', locale),
    exact: true,
  });
  if (await variables.isVisible()) {
    await variables.focus();
    await variables.press('Space');
  }
  const trigger = page.getByRole('button', {
    name: t('scientific.backup.open', locale),
  });
  await tabTo(page, trigger);
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', {
    name: t('scientific.backup.title', locale),
  });
  await expect(dialog).toBeVisible();
  return { dialog, trigger };
}
async function choose(page: Page, locale: Locale, content: string | Buffer) {
  const chooser = page.waitForEvent('filechooser');
  await page
    .getByRole('button', { name: t('scientific.backup.import', locale) })
    .click();
  await (
    await chooser
  ).setFiles({
    name: 'definitions.json',
    mimeType: 'application/json',
    buffer: Buffer.from(content),
  });
}
for (const [locale, width, theme] of [
  ['de', 1280, 'light'],
  ['en', 3840, 'dark'],
] as const) {
  test(`${locale}: offline backup → change → preview/cancel → confirm → reload preserves current history`, async ({
    page,
    context,
  }, info) => {
    await qaSetup(page, theme, '#6750a4', locale);
    await page.setViewportSize({ width, height: 1080 });
    const initial = [
      'a=-12345678901234567890123456789012345678901234567890',
      'large=1e9999',
      'z=-2-3i',
      'xs=factor(360)',
      'f(x)=x+a',
      'g(x)=f(x)+large',
      'delayed(x)=1/0',
      `variable_${'x'.repeat(200)}=1`,
    ].reduce((env, source) => step(source, env), createEnvironment());
    await seed(page, initial);
    const external: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (
        ['http:', 'https:'].includes(url.protocol) &&
        url.origin !== 'http://127.0.0.1:4173'
      )
        external.push(url.href);
    });
    await page.goto('/m8e-calc/#/scientific');
    await ready(page, 'scientific');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    let { dialog, trigger } = await openBackup(page, locale);
    const downloadEvent = page.waitForEvent('download');
    await dialog
      .getByRole('button', { name: t('scientific.backup.export', locale) })
      .click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('m8e-calc-definitions-v1.json');
    const path = await download.path();
    if (!path) throw new Error('Expected local download');
    const bytes = await readFile(path);
    const data = JSON.parse(bytes.toString('utf8'));
    expect(Object.keys(data).sort()).toEqual([
      'format',
      'functions',
      'variables',
      'version',
    ]);
    expect(data.variables).toEqual(initial.variables);
    expect(data.functions).toEqual(initial.functions);
    expect(bytes.toString()).not.toContain('onlineRates');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    const editor = page.getByRole('textbox', {
      name: t('scientific.expression', locale),
    });
    for (const source of ['a=99', 'added=8']) {
      await editor.fill(source);
      await editor.press('Enter');
      await expect
        .poll(
          async () =>
            (await snapshot(page)).environment.variables[
              source.split('=')[0] ?? ''
            ],
        )
        .toEqual({ kind: 'number', value: source.split('=')[1] });
    }
    const changed = await snapshot(page);
    ({ dialog, trigger } = await openBackup(page, locale));
    await choose(page, locale, bytes);
    await expect(
      dialog.getByRole('region', {
        name: t('scientific.backup.preview', locale),
      }),
    ).toBeVisible();
    expect(await snapshot(page)).toEqual(changed);
    const cancel = dialog.getByRole('button', {
      name: t('scientific.backup.cancel', locale),
    });
    await cancel.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toBeFocused();
    await page.reload();
    await ready(page, 'scientific');
    expect(await snapshot(page)).toEqual(changed);
    ({ dialog } = await openBackup(page, locale));
    await choose(page, locale, bytes);
    const confirm = dialog.getByRole('button', {
      name: t('scientific.backup.replace', locale),
    });
    await expect(confirm).toBeEnabled();
    expect(
      await dialog
        .locator('.scientific-backup-content')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    const axe = await new AxeBuilder({ page })
      .include('.scientific-backup-dialog')
      .options({ rules: { 'label-content-name-mismatch': { enabled: true } } })
      .analyze();
    expect(axe.violations).toEqual([]);
    expect(
      [...axe.passes, ...axe.inapplicable, ...axe.incomplete].some(
        (rule) => rule.id === 'label-content-name-mismatch',
      ),
    ).toBe(true);
    await info.attach(`wp12-${locale}-preview`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    await confirm.focus();
    await page.keyboard.press('Enter');
    await expect(
      dialog.getByText(t('scientific.backup.imported', locale)),
    ).toBeVisible();
    const imported = await snapshot(page);
    expect(imported.environment.variables).toEqual(initial.variables);
    expect(imported.environment.functions).toEqual(initial.functions);
    expect(imported.environment.history).toEqual(changed.environment.history);
    expect(imported.globalHistory).toBe(changed.globalHistory);
    await page.keyboard.press('Escape');
    await page.reload();
    await ready(page, 'scientific');
    expect(await snapshot(page)).toEqual(imported);
    expect(external).toEqual([]);
  });
}
test.describe('WP-12 pending worker and rejection paths', () => {
  test.use({ serviceWorkers: 'block' });
  test.beforeEach(async ({ page }) => {
    await qaSetup(page);
  });
  for (const finishBeforeConfirmation of [false, true]) {
    test(`pending worker, changed preview=${finishBeforeConfirmation}: imported definitions and latest history survive late delivery`, async ({
      page,
    }) => {
      await seed(page, step('old=3'));
      await installScientificWorkerProbe(page);
      await page.goto('/m8e-calc/#/scientific');
      await ready(page, 'scientific');
      const editor = page.getByRole('textbox', {
        name: t('scientific.expression', 'de'),
      });
      await editor.fill('late=99');
      await editor.press('Enter');
      await expect
        .poll(() =>
          page.evaluate(() => {
            const probe = window.__scientificWorkerProbe;
            return probe.posts.some(
              (p) =>
                p.kind === 'execute' &&
                probe.started.includes(p.id) &&
                probe.replies.includes(p.id),
            );
          }),
        )
        .toBe(true);
      const { dialog } = await openBackup(page, 'de');
      const imported = step('v=-7');
      await choose(page, 'de', exportDefinitionBackup(imported));
      const confirm = dialog.getByRole('button', {
        name: t('scientific.backup.replace', 'de'),
      });
      await expect(confirm).toBeEnabled();
      if (finishBeforeConfirmation) {
        await page.evaluate(() => window.__scientificWorkerProbe.release());
        await expect(confirm).toBeDisabled();
        await expect(
          dialog.getByText(t('scientific.backup.stale', 'de')),
        ).toBeVisible();
        await dialog
          .getByRole('button', { name: t('scientific.backup.refresh', 'de') })
          .click();
        await expect(confirm).toBeEnabled();
      }
      const current = await snapshot(page);
      await confirm.click();
      await expect(
        dialog.getByText(t('scientific.backup.imported', 'de')),
      ).toBeVisible();
      await page.evaluate(() => window.__scientificWorkerProbe.release());
      await expect
        .poll(() => page.evaluate(() => window.__scientificWorkerProbe.active))
        .toBe(0);
      const after = await snapshot(page);
      expect(after.environment.variables).toEqual(imported.variables);
      expect(after.environment.history).toEqual(current.environment.history);
      expect(after.globalHistory).toBe(current.globalHistory);
      await page.reload();
      await ready(page, 'scientific');
      expect(await snapshot(page)).toEqual(after);
    });
  }
  for (const [kind, buffer, message] of [
    ['broken', Buffer.from('{broken'), 'invalid'],
    ['oversized', Buffer.alloc(MAX_DEFINITION_FILE_BYTES + 1, ' '), 'tooLarge'],
    [
      'version',
      Buffer.from(
        exportDefinitionBackup(step('v=1')).replace(
          '"version":1',
          '"version":99',
        ),
      ),
      'version',
    ],
    [
      'foreign AST',
      Buffer.from(
        JSON.stringify({
          format: 'm8e-calc.definitions',
          version: 1,
          variables: {},
          functions: {
            f: {
              parameters: ['x'],
              expression: { kind: 'html', range: { start: 0, end: 1 } },
            },
          },
        }),
      ),
      'invalid',
    ],
  ] as const) {
    test(`${kind} file preserves the exact existing storage and definitions`, async ({
      page,
    }) => {
      await seed(page, step('old=3'));
      await page.goto('/m8e-calc/#/scientific');
      await ready(page, 'scientific');
      const before = await snapshot(page);
      const { dialog } = await openBackup(page, 'de');
      await choose(page, 'de', buffer);
      await expect(
        dialog.getByText(t(`scientific.backup.${message}`, 'de')),
      ).toBeVisible();
      await expect(
        dialog.getByRole('button', {
          name: t('scientific.backup.replace', 'de'),
        }),
      ).toHaveCount(0);
      expect(await snapshot(page)).toEqual(before);
      await page.reload();
      await ready(page, 'scientific');
      expect(await snapshot(page)).toEqual(before);
    });
  }
  test('failed storage replacement preserves the old session and disk data and locks further imports', async ({
    page,
  }) => {
    await seed(page, step('old=3'));
    await page.goto('/m8e-calc/#/scientific');
    await ready(page, 'scientific');
    const before = await snapshot(page);
    const { dialog } = await openBackup(page, 'de');
    await choose(page, 'de', exportDefinitionBackup(step('v=7')));
    const confirm = dialog.getByRole('button', {
      name: t('scientific.backup.replace', 'de'),
    });
    await expect(confirm).toBeEnabled();
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'm8e-calc.scientific')
          throw new DOMException('Quota', 'QuotaExceededError');
        original.call(this, key, value);
      };
    });
    await confirm.click();
    await expect(
      dialog.getByText(t('scientific.backup.saveFailed', 'de')),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: t('scientific.backup.import', 'de') }),
    ).toBeDisabled();
    expect(await snapshot(page)).toEqual(before);
    await page.keyboard.press('Escape');
    await expect(page.locator('.scientific-variables')).toContainText(
      'old = 3',
    );
    await page.reload();
    await ready(page, 'scientific');
    expect(await snapshot(page)).toEqual(before);
  });
  test('recovery protects damaged original bytes while a valid unsaved session can be exported', async ({
    page,
  }) => {
    const original = '{broken original';
    await seed(page, original);
    await page.goto('/m8e-calc/#/scientific');
    await ready(page, 'scientific');
    const editor = page.getByRole('textbox', {
      name: t('scientific.expression', 'de'),
    });
    await editor.fill('session=7');
    await editor.press('Enter');
    await expect(page.locator('.scientific-result-text')).toHaveText('7');
    const { dialog } = await openBackup(page, 'de');
    await expect(
      dialog.getByRole('button', { name: t('scientific.backup.import', 'de') }),
    ).toBeDisabled();
    const event = page.waitForEvent('download');
    await dialog
      .getByRole('button', { name: t('scientific.backup.export', 'de') })
      .click();
    const path = await (await event).path();
    if (!path) throw new Error('Expected local backup');
    const backup = JSON.parse(await readFile(path, 'utf8'));
    expect(backup.variables.session).toEqual({ kind: 'number', value: '7' });
    expect(backup).not.toHaveProperty('history');
    expect(
      await page.evaluate(() => localStorage.getItem('m8e-calc.scientific')),
    ).toBe(original);
    await page.reload();
    await ready(page, 'scientific');
    expect(
      await page.evaluate(() => localStorage.getItem('m8e-calc.scientific')),
    ).toBe(original);
    await expect(
      page.getByText(t('scientific.recovery.invalid', 'de'), { exact: true }),
    ).toBeVisible();
  });
});
