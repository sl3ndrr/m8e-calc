import { expect, test } from '@playwright/test';
import { holdChunk } from './accentLoading';

// Route-controlled module loading must not be satisfied by the PWA precache.
test.use({ serviceWorkers: 'block' });

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
  } finally {
    panel.release();
    lab.release();
  }
});
