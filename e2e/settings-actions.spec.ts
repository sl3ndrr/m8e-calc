import { expect, test } from '@playwright/test';
import { holdChunk } from './accentLoading';

// Isolate the mock browser prompt and cold module requests from SW precaching.
// These tests verify the app/browser API contract, never an OS installation.
test.use({ serviceWorkers: 'block' });

test('shell keeps theme; settings own nested color selection and persistence', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/m8e-calc/#/simple');
  await expect(page.locator('.calculator-announcement')).toHaveText('0');
  await expect(page.locator('.shell-toolbar .accent-trigger')).toHaveCount(0);
  await expect(page.locator('.shell-toolbar')).not.toContainText(
    'App installieren',
  );
  await expect(
    page.getByRole('radiogroup', { name: 'Erscheinungsbild' }),
  ).toBeVisible();
  const opener = page.getByRole('button', {
    name: 'Einstellungen',
    exact: true,
  });
  await opener.click();
  const settings = page.getByRole('dialog', {
    name: 'Einstellungen',
    exact: true,
  });
  const appearance = settings.getByRole('region', { name: 'Erscheinungsbild' });
  const trigger = appearance.getByRole('button', {
    name: 'Akzentfarbe anpassen',
  });
  await info.attach('settings-1280', {
    body: await page.screenshot({ path: info.outputPath('settings-1280.png') }),
    contentType: 'image/png',
  });
  await trigger.click();
  const picker = page.getByRole('dialog', { name: 'Deine Farbwelt' });
  await expect(
    picker.getByRole('button', { name: 'Iris', exact: true }),
  ).toBeFocused();
  await picker.getByRole('button', { name: 'Koralle', exact: true }).click();
  const variant = picker.getByRole('button', { name: /Schema-Variante/ });
  await info.attach('nested-accent-1280', {
    body: await page.screenshot({ path: info.outputPath('accent-1280.png') }),
    contentType: 'image/png',
  });
  await variant.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(picker).toBeVisible();
  await expect(variant).toBeFocused();
  await variant.click();
  await page.getByRole('option', { name: 'Lebendig', exact: true }).click();
  await picker.getByRole('button', { name: /Kontrast/ }).click();
  await page.getByRole('option', { name: 'Mittel', exact: true }).click();
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press('Tab');
    expect(
      await picker.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(settings).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await page.reload();
  await opener.click();
  await trigger.click();
  await expect(picker.getByLabel('Eigene Farbe')).toHaveValue('#e2675a');
  await expect(variant).toContainText('Lebendig');
  await expect(picker.getByRole('button', { name: /Kontrast/ })).toContainText(
    'Mittel',
  );
  await picker.getByRole('button', { name: 'Farben zurücksetzen' }).click();
  await expect(picker.getByLabel('Eigene Farbe')).toHaveValue('#6750a4');
});

for (const outcome of ['accepted', 'dismissed', 'rejected'] as const) {
  test(`prompt received before settings opens: ${outcome}`, async ({
    page,
  }) => {
    await page.goto('/m8e-calc/#/simple');
    await expect(page.locator('.calculator-announcement')).toHaveText('0');
    await page.evaluate((outcome) => {
      const state = { calls: 0, finish: () => {} };
      const userChoice = new Promise<{ outcome: 'accepted' | 'dismissed' }>(
        (resolve) => {
          state.finish = () =>
            resolve({
              outcome: outcome === 'accepted' ? 'accepted' : 'dismissed',
            });
        },
      );
      Object.assign(window, { installTest: state });
      const event = Object.assign(
        new Event('beforeinstallprompt', { cancelable: true }),
        {
          prompt: () => {
            state.calls++;
            return outcome === 'rejected'
              ? Promise.reject(new Error('Browser declined'))
              : Promise.resolve();
          },
          userChoice,
        },
      );
      window.dispatchEvent(event);
      if (!event.defaultPrevented) throw Error('Install listener missing');
    }, outcome);
    const opener = page.getByRole('button', {
      name: 'Einstellungen',
      exact: true,
    });
    const install = page.getByRole('button', {
      name: 'App installieren',
      exact: true,
    });
    await expect(install).toHaveCount(0);
    expect(
      await page.evaluate(() => Reflect.get(window, 'installTest').calls),
    ).toBe(0);
    await opener.click();
    const app = page.getByRole('region', { name: 'App', exact: true });
    await expect(
      app.getByRole('button', { name: 'App installieren' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await opener.click();
    await install.click();
    expect(
      await page.evaluate(() => Reflect.get(window, 'installTest').calls),
    ).toBe(1);
    await page.evaluate(() => Reflect.get(window, 'installTest').finish());
    await expect(install).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Akzentfarbe anpassen' }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();
    await opener.click();
    await expect(install).toHaveCount(0);
    await expect(
      page.getByRole('region', { name: 'App', exact: true }),
    ).toHaveCount(0);
  });
}

test('no prompt and appinstalled leave no dead install action', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/simple');
  await expect(page.locator('.calculator-announcement')).toHaveText('0');
  const opener = page.getByRole('button', {
    name: 'Einstellungen',
    exact: true,
  });
  const install = page.getByRole('button', {
    name: 'App installieren',
    exact: true,
  });
  await opener.click();
  await expect(install).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: () => {
          throw Error('Must never install automatically');
        },
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      }),
    );
    window.dispatchEvent(new Event('appinstalled'));
  });
  await opener.click();
  await expect(install).toHaveCount(0);
  await expect(page.locator('.shell-toolbar .accent-trigger')).toHaveCount(0);
});

test('English settings use translated appearance and install labels', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'm8e-calc.settings',
      JSON.stringify({
        version: 4,
        state: { language: 'en' },
      }),
    ),
  );
  await page.goto('/m8e-calc/#/simple');
  await expect(page.locator('.calculator-announcement')).toHaveText('0');
  await page.evaluate(() =>
    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      }),
    ),
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Appearance', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'App', exact: true }).getByRole('button'),
  ).toHaveText('Install app');
});

test('nested Escape during a cold load preserves focus and allows a cached reopen', async ({
  page,
}) => {
  const panel = await holdChunk(page, 'AccentPanel');
  try {
    await page.goto('/m8e-calc/#/simple');
    await page
      .getByRole('button', { name: 'Einstellungen', exact: true })
      .click();

    const trigger = page.getByRole('button', { name: 'Akzentfarbe anpassen' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await panel.requested;
    await expect(
      page.getByRole('dialog', { name: 'Akzentfarbe anpassen' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    const response = page.waitForResponse(/\/assets\/AccentPanel-[^/]+\.js$/);
    panel.release();
    await response;
    await expect(
      page.getByRole('dialog', { name: 'Einstellungen', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    const picker = page.getByRole('dialog', { name: 'Deine Farbwelt' });
    await expect(
      picker.getByRole('button', { name: 'Iris', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(picker).toBeHidden();
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Einstellungen', exact: true }),
    ).toBeFocused();
  } finally {
    panel.release();
  }
});
