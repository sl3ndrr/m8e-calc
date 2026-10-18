import { expect, test, type Page } from '@playwright/test';

// Route-controlled module loading must not be satisfied by the PWA precache.
test.use({ serviceWorkers: 'block' });

function barrier() {
  let release: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release: () => release?.() };
}

async function holdChunk(page: Page, name: 'AccentPanel' | 'DesignLab') {
  const requested = barrier();
  const held = barrier();
  await page.route(new RegExp(`/assets/${name}-[^/]+\\.js$`), async (route) => {
    requested.release();
    await held.promise;
    await route.continue();
  });
  return { requested: requested.promise, release: held.release };
}

test('cold accent dialog opens and focuses Iris while the design lab is loading', async ({
  page,
}) => {
  const lab = await holdChunk(page, 'DesignLab');
  const panel = await holdChunk(page, 'AccentPanel');
  try {
    await page.goto('/m8e-calc/#/design');
    await lab.requested;
    const group = page.getByRole('radiogroup', { name: 'Erscheinungsbild' });
    await group.getByRole('radio', { name: /^System/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('radio', { name: 'Dunkel' })).toBeChecked();
    const trigger = page.getByRole('button', { name: 'Akzentfarbe anpassen' });
    await trigger.click();
    await panel.requested;
    const loading = page.getByRole('dialog', { name: 'Akzentfarbe anpassen' });
    await expect(loading).toBeVisible();
    await expect(
      loading.getByRole('progressbar', { name: 'Wird geladen' }),
    ).toBeVisible();
    panel.release();
    const picker = page.getByRole('dialog', { name: 'Deine Farbwelt' });
    await expect(
      picker.getByRole('button', { name: 'Iris', exact: true }),
    ).toBeFocused();
    await picker.getByRole('button', { name: 'Koralle', exact: true }).click();
    await expect(picker.getByLabel('Eigene Farbe')).toHaveValue('#e2675a');
    await page.keyboard.press('Escape');
    await expect(picker).toBeHidden();
    await expect(trigger).toBeFocused();
    lab.release();
    await expect(
      page.getByRole('heading', { name: 'Raum für deinen Stil.' }),
    ).toBeVisible();
  } finally {
    panel.release();
    lab.release();
  }
});

test('Escape during a cold load preserves focus and allows a cached reopen', async ({
  page,
}) => {
  const panel = await holdChunk(page, 'AccentPanel');
  try {
    await page.goto('/m8e-calc/#/simple');
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
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    const picker = page.getByRole('dialog', { name: 'Deine Farbwelt' });
    await expect(
      picker.getByRole('button', { name: 'Iris', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(picker).toBeHidden();
    await expect(trigger).toBeFocused();
  } finally {
    panel.release();
  }
});
