import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// Isolate executed startup imports from the separately tested full SW precache.
test.use({ serviceWorkers: 'block', viewport: { width: 1920, height: 1080 } });
for (const locale of ['de-DE', 'en-US']) {
  test.describe(locale, () => {
    test.use({ locale });
    test('cold usable simple path matches the measured static closure', async ({
      page,
    }, info) => {
      const manifest = JSON.parse(
        readFileSync('dist/.vite/manifest.json', 'utf8'),
      ) as Record<
        string,
        { file: string; isEntry?: boolean; imports?: string[] }
      >;
      const expected = new Set<string>();
      function visit(key: string): void {
        const chunk = manifest[key];
        if (!chunk || expected.has(chunk.file)) return;
        expected.add(chunk.file);
        for (const child of chunk.imports ?? []) visit(child);
      }
      const entry = Object.keys(manifest).find((key) => manifest[key]?.isEntry);
      const simple = Object.keys(manifest).find((key) =>
        key.endsWith('/SimpleMode.tsx'),
      );
      if (!entry || !simple) throw Error('Missing startup entry');
      visit(entry);
      visit(simple);
      const scripts = new Set<string>();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('request', (request) => {
        if (request.resourceType() === 'script')
          scripts.add(
            new URL(request.url()).pathname.replace('/m8e-calc/', ''),
          );
      });
      await page.addInitScript(() => {
        const metrics = { firstUsable: 0, cls: 0 };
        Object.assign(window, { ap30Startup: metrics });
        if (PerformanceObserver.supportedEntryTypes.includes('layout-shift'))
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              if (!Reflect.get(entry, 'hadRecentInput'))
                metrics.cls += Number(Reflect.get(entry, 'value'));
          }).observe({ type: 'layout-shift', buffered: true });
        const observer = new MutationObserver(() => {
          if (
            document.querySelectorAll('.simple-calculator [data-key]').length >=
              24 &&
            document.querySelector('.calculator-announcement')
          ) {
            metrics.firstUsable = performance.now();
            observer.disconnect();
          }
        });
        observer.observe(document, { childList: true, subtree: true });
      });
      await page.goto('/m8e-calc/#/simple');
      await expect(page.locator('.calculator-announcement')).toHaveText('0');
      await page.keyboard.type('100+10%==');
      await expect(page.locator('.calculator-announcement')).toHaveText('120');
      // Required calculation must already work without another module request.
      expect([...scripts].sort()).toEqual([...expected].sort());
      const startup = await page.evaluate(
        () =>
          Reflect.get(window, 'ap30Startup') as {
            firstUsable: number;
            cls: number;
          },
      );
      expect(startup.firstUsable).toBeGreaterThan(0);
      expect(startup.cls).toBe(0);
      const settingsName = locale === 'de-DE' ? 'Einstellungen' : 'Settings';
      await page
        .getByRole('button', { name: settingsName, exact: true })
        .click();
      await expect(
        page.getByRole('dialog', { name: settingsName, exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('switch', {
          name: locale === 'de-DE' ? 'Online-Kurse laden' : 'Load online rates',
        }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', { name: settingsName, exact: true }),
      ).toBeFocused();
      expect(errors).toEqual([]);
      const graph = JSON.parse(
        readFileSync('test-results/ap23/modules-normal.json', 'utf8'),
      ) as { file: string; modules: string[] }[];
      const evidence = {
        sha: process.env.AP30_SOURCE,
        locale,
        project: info.project.name,
        ...startup,
        scripts: [...expected].sort(),
        loadedModules: graph.filter((chunk) => expected.has(chunk.file)),
      };
      const output = `test-results/ap30/${process.env.AP30_PHASE ?? 'after'}`;
      mkdirSync(output, { recursive: true });
      writeFileSync(
        `${output}/startup-${info.project.name}-${locale}.json`,
        JSON.stringify(evidence, null, 2),
      );
      await info.attach('startup', {
        body: JSON.stringify(evidence, null, 2),
        contentType: 'application/json',
      });
    });
  });
}
