import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  frames,
  paintedColorPixels,
  readFrames,
  recordFrames,
} from './calculatorCapture';
import { allowClipboard } from './clipboard';
import { attach, held, holdNext, idle, picture, resume } from './ap36Capture';

type Frame = Awaited<ReturnType<typeof frames>>[number];
function stable(samples: Frame[], rest: Frame) {
  for (const f of samples) {
    expect(f.corners).toEqual(rest.corners);
    expect(f.hostCorners).toEqual(rest.hostCorners);
    expect(f.layerCorners).toEqual(rest.corners);
    expect(f.contentCorners).toEqual(rest.corners);
    expect(f.width).toBe(rest.width);
    expect(f.height).toBe(rest.height);
    expect(f.box).toEqual(rest.box);
    expect(f.hit).toBe(true);
    expect(f.hostTransform).toBe('none');
    expect(f.clip).toBe('clip');
    expect(f.contentInsideSurface).toBe(true);
    expect(f.contentSharesSurface).toBe(true);
    expect(f.contentLocalTransform).toBe('none');
    expect(f.contentTransform).toBe(f.transform);
  }
}
async function settle(button: Locator) {
  await button.evaluate(async (node) => {
    await Promise.all(
      node
        .getAnimations({ subtree: true })
        .map((a) => a.finished.catch(() => {})),
    );
  });
}
async function subject(
  page: Page,
  gallery: boolean,
  kind: 'Button' | 'IconButton',
) {
  await page.goto(`/m8e-calc/#/${gallery ? 'design' : 'scientific'}`);
  if (gallery)
    return page.locator(
      `[data-component="${kind}"] [data-state="default"] button`,
    );
  await expect(page.locator('.cm-content')).toBeVisible();
  await page.locator('.cm-content').fill('2+3');
  return kind === 'Button'
    ? page
        .locator('.scientific-actions')
        .first()
        .getByRole('button', { name: 'Auswerten', exact: true })
    : page.locator('.mode-share .ui-icon-button');
}

// Calling suites retain traces with screenshots/snapshots disabled while the
// native timeline runs. Explicit picture() attachments supply the intermediate
// images without trace filmstrip/DOM capture blocking WebKit's short effects.
/** AP42 extends the AP19 recorder and the AP36 browser cases; no new clock or
 * animation shim. Before-only expected failures require the actual zero-radius
 * frame from the pinned main build, after all raw evidence has been attached. */
export function buttonContractCases(gallery: boolean) {
  for (const theme of ['light', 'dark'] as const) {
    for (const kind of ['Button', 'IconButton'] as const) {
      test(`button contract ${kind} ${theme}: live press/release, reversal, cancel and keyboard`, async ({
        page,
        context,
      }, info) => {
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: 'no-preference',
        });
        await page.addInitScript(
          (themeMode) =>
            localStorage.setItem(
              'm8e-calc.settings',
              JSON.stringify({
                version: 4,
                state: { themeMode, motionLevel: 'full' },
              }),
            ),
          theme,
        );
        if (!gallery && kind === 'IconButton') await allowClipboard(context);
        const button = await subject(page, gallery, kind);
        const build = (await (
          await page.request.get('/m8e-calc/build-info.json')
        ).json()) as { sourceCommit: string | null; target: string };
        expect(build.target).toBe(gallery ? 'gallery' : 'normal');
        const expectedSource =
          process.env.AP42_PHASE === 'before'
            ? process.env.GITHUB_SHA
            : (process.env.AP42_SOURCE ?? process.env.GITHUB_SHA);
        if (expectedSource) expect(build.sourceCommit).toBe(expectedSource);
        await button.scrollIntoViewIfNeeded();
        await page.evaluate(() => document.fonts.ready);
        await settle(button);
        const rest = (await frames(button, 1))[0];
        if (!rest) throw Error('Missing resting frame');
        await button.hover();
        const downRecording = await recordFrames(button, 'pointerdown', 30);
        await page.mouse.down();
        const down = await readFrames(downRecording);
        const upRecording = await recordFrames(button, 'pointerup', 18);
        await page.mouse.up();
        const up = await readFrames(upRecording);
        await attach(info, 'button-contract-live', {
          source: process.env.AP42_PHASE ?? 'candidate',
          build,
          gallery,
          kind,
          theme,
          rest,
          down,
          up,
        });

        // A separate real transition is held for a readable intermediate image.
        // The preceding unpaused rAF sequence is the moving-frame proof.
        await settle(button);
        await holdNext(
          page,
          '.ui-button-surface, .ui-button-content, .ui-button',
          false,
          120,
        );
        await button.hover();
        await page.mouse.down();
        await expect
          .poll(() => held(page).then((a) => a.length))
          .toBeGreaterThan(0);
        await attach(info, 'button-contract-held', await held(page));
        await picture(
          info,
          'button-contract-middle',
          gallery ? button.locator('..') : page.locator('.app-shell'),
        );
        await resume(page);
        await page.mouse.up();
        await settle(button);
        if (process.env.AP42_PHASE === 'before') {
          expect(
            down.some((f) => f.corners.some((r) => parseFloat(r) === 0)),
          ).toBe(true);
          test.fail(
            true,
            'Pinned main animates full radius to small with spatial-fast and hits a zero-radius intermediate frame.',
          );
        }
        stable([...down, ...up], rest);
        expect(new Set(down.map((f) => f.transform)).size).toBeGreaterThan(2);
        expect(new Set(up.map((f) => f.transform)).size).toBeGreaterThan(2);
        expect(down.some((f) => f.layerOpacity > 0)).toBe(true);

        // Interrupt release at real rAF boundaries, then press again before it
        // settles. No minimum hold; the real click action is never postponed.
        const repeated = [];
        for (let i = 0; i < 4; i++) {
          const press = await recordFrames(button, 'pointerdown', 2);
          await page.mouse.down();
          repeated.push(...(await readFrames(press)));
          const release = await recordFrames(button, 'pointerup', 2);
          await page.mouse.up();
          repeated.push(...(await readFrames(release)));
        }
        stable(repeated, rest);
        await attach(info, 'button-contract-reversals', repeated);
        await settle(button);

        // Leaving a native press and an explicit pointercancel both release.
        await page.mouse.down();
        await expect(button).toHaveAttribute('data-pressed');
        await page.mouse.move(0, 0);
        await expect(button).not.toHaveAttribute('data-pressed');
        await page.mouse.up();
        await button.hover();
        await button.evaluate((node) =>
          node.addEventListener(
            'pointerdown',
            (e) =>
              Reflect.set(node, 'pressPointer', (e as PointerEvent).pointerId),
            { once: true },
          ),
        );
        await page.mouse.down();
        await button.evaluate((node) =>
          node.dispatchEvent(
            new PointerEvent('pointercancel', {
              bubbles: true,
              pointerId: Reflect.get(node, 'pressPointer') as number,
              pointerType: 'mouse',
            }),
          ),
        );
        await expect(button).not.toHaveAttribute('data-pressed');
        await page.mouse.up();
        stable(await frames(button), rest);
        await settle(button);

        await button.focus();
        for (const key of ['Space', 'Enter']) {
          const press = await recordFrames(button, 'keydown', 4);
          await page.keyboard.down(key);
          const pressed = await readFrames(press);
          expect(
            pressed.every(
              (f) =>
                f.outline === 'solid' &&
                parseFloat(f.outlineOffset) >= 3 &&
                !f.focusClipped,
            ),
          ).toBe(true);
          stable(pressed, rest);
          if (key === 'Space')
            await picture(
              info,
              'button-contract-focus',
              gallery ? button.locator('..') : page.locator('.app-shell'),
            );
          const release = await recordFrames(button, 'keyup', 12);
          await page.keyboard.up(key);
          const released = await readFrames(release);
          stable(released, rest);
          await attach(info, `button-contract-keyboard-${key}`, {
            pressed,
            released,
          });
          await settle(button);
        }
        if (!gallery && kind === 'Button')
          await expect(page.locator('.scientific-result-text')).toHaveText('5');
        await idle(page, gallery);
      });
    }
  }

  if (!gallery) {
    test('button contract disabling on release cancels the in-flight feedback', async ({
      page,
    }, info) => {
      await page.goto('/m8e-calc/#/simple');
      await expect(page.locator('.calculator-value')).toBeVisible();
      await page.keyboard.type('2+3=');
      await expect(page.locator('.calculator-announcement')).toHaveText('5');
      await page
        .getByRole('button', { name: 'Verlauf ein-/ausblenden' })
        .click();
      const button = page.locator('.history-tools > .ui-button');
      await expect(button).toBeEnabled();
      await settle(button);
      await button.hover();
      const press = await recordFrames(button, 'pointerdown', 2);
      await page.mouse.down();
      const down = await readFrames(press);
      expect(down.some((f) => f.transform !== 'none')).toBe(true);
      const release = await recordFrames(button, 'pointerup');
      await page.mouse.up();
      await expect(button).toBeDisabled();
      const up = await readFrames(release);
      expect(
        up.every(
          (f) =>
            f.transform === 'none' &&
            f.layerOpacity === 0 &&
            f.willChange === 'auto',
        ),
      ).toBe(true);
      expect(
        await button.evaluate(
          (node) => node.getAnimations({ subtree: true }).length,
        ),
      ).toBe(0);
      await attach(info, 'button-contract-disabled-release', { down, up });
      await idle(page);
    });
    test('button contract scrolled cards keep the complete focus ring', async ({
      page,
    }, info) => {
      await page.goto('/m8e-calc/#/convert');
      for (const selector of ['.convert-category-grid', '.convert-unit-grid']) {
        const button = page.locator(`${selector} .ui-button`).first();
        await button.scrollIntoViewIfNeeded();
        await button.focus();
        const recording = await recordFrames(button, 'keydown', 6);
        await page.keyboard.down('Space');
        const pressed = await readFrames(recording);
        expect(
          pressed.every(
            (f) =>
              f.outline === 'solid' &&
              f.outlineOffset === '-4px' &&
              !f.focusClipped,
          ),
        ).toBe(true);
        expect(new Set(pressed.map((f) => f.radius)).size).toBe(1);
        await picture(info, 'scrolled-card-focus', button.locator('..'));
        const box = await button.boundingBox();
        if (!box) throw Error('Missing focused card bounds');
        const png = await button.screenshot({
          animations: 'allow',
          scale: 'css',
        });
        const focusSelector = `${selector} .ui-button[data-focus-visible]`;
        const pixels = await paintedColorPixels(
          page,
          png,
          focusSelector,
          'outlineColor',
        );
        // Count CSS pixels in every engine, including Safari's HiDPI profile.
        // Save the exact decoder input as well as the full context image.
        await info.attach(`button-contract-focus-paint-${selector}`, {
          body: png,
          contentType: 'image/png',
        });
        // A rounded 3px ring must paint substantially more than a 1px edge.
        const minimum = 2 * (box.width + box.height) * 2;
        let covered: number | null = null;
        if (selector === '.convert-category-grid') {
          const surface = button.locator('.ui-button-surface');
          await surface.evaluate((node) => {
            (node as HTMLElement).style.zIndex = 'auto';
          });
          try {
            const counterfactual = await button.screenshot({
              animations: 'allow',
              scale: 'css',
            });
            covered = await paintedColorPixels(
              page,
              counterfactual,
              focusSelector,
              'outlineColor',
            );
            await info.attach('button-contract-focus-covered', {
              body: counterfactual,
              contentType: 'image/png',
            });
          } finally {
            await surface.evaluate((node) => {
              (node as HTMLElement).style.zIndex = '';
            });
          }
        }
        await attach(info, `button-contract-focus-pixels-${selector}`, {
          pixels,
          covered,
          minimum,
          box,
          scale: 'css',
        });
        expect(pixels).toBeGreaterThan(minimum);
        if (covered !== null) expect(covered).toBeLessThan(minimum);
        await page.keyboard.up('Space');
        await attach(info, `button-contract-focus-${selector}`, pressed);
      }
      await idle(page);
    });
    return;
  }
  for (const [level, os] of [
    ['full', false],
    ['reduced', false],
    ['off', false],
    ['full', true],
  ] as const) {
    test(`button contract motion ${level} OS ${os}: both controls and live interruption`, async ({
      page,
    }, info) => {
      await page.emulateMedia({
        reducedMotion: os ? 'reduce' : 'no-preference',
      });
      await page.addInitScript(
        (motionLevel) =>
          localStorage.setItem(
            'm8e-calc.settings',
            JSON.stringify({ version: 4, state: { motionLevel } }),
          ),
        level,
      );
      await page.goto('/m8e-calc/#/design');
      for (const kind of ['Button', 'IconButton']) {
        const button = page.locator(
          `[data-component="${kind}"] [data-state="default"] button`,
        );
        await button.scrollIntoViewIfNeeded();
        await settle(button);
        const rest = (await frames(button, 1))[0];
        if (!rest) throw Error('Missing resting frame');
        await button.hover();
        const press = await recordFrames(button, 'pointerdown');
        await page.mouse.down();
        const down = await readFrames(press);
        await page.mouse.up();
        const up = await frames(button);
        stable([...down, ...up], rest);
        expect(
          [...down, ...up].every(
            (f) =>
              f.willChange === (level === 'full' && !os ? 'transform' : 'auto'),
          ),
        ).toBe(true);
        if (level !== 'full' || os)
          expect([...down, ...up].every((f) => f.transform === 'none')).toBe(
            true,
          );
        await attach(info, `button-contract-${kind}-${level}`, { down, up });
      }
      // Switch during a running press via the real native gallery selector.
      const button = page.locator(
        '[data-component="Button"] [data-state="default"] button',
      );
      await button.scrollIntoViewIfNeeded();
      for (const interruption of ['off', 'os'] as const) {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.getByLabel('Animationsstufe').selectOption('full');
        await button.hover();
        const press = await recordFrames(button, 'pointerdown', 2);
        await page.mouse.down();
        const before = await readFrames(press);
        expect(before.some((f) => f.transform !== 'none')).toBe(true);
        if (interruption === 'off')
          await page.getByLabel('Animationsstufe').selectOption('off');
        else await page.emulateMedia({ reducedMotion: 'reduce' });
        const after = await frames(button);
        expect(
          after.every((f) => f.transform === 'none' && f.willChange === 'auto'),
        ).toBe(true);
        expect(
          await button.evaluate(
            (node) => node.getAnimations({ subtree: true }).length,
          ),
        ).toBe(0);
        await page.mouse.up();
        await attach(info, `button-contract-live-${interruption}`, {
          before,
          after,
        });
      }
      await idle(page, true);
    });
  }

  test('button contract selected Button and IconButton forms are endpoints', async ({
    page,
  }, info) => {
    await page.goto('/m8e-calc/#/design');
    for (const kind of ['Button', 'IconButton']) {
      const button = page.locator(
        `[data-component="${kind}"] [data-state="selected"] button`,
      );
      await button.scrollIntoViewIfNeeded();
      const selected = (await frames(button, 1))[0];
      if (!selected) throw Error('Missing selected frame');
      const samples = [];
      for (let i = 0; i < 6; i++) {
        const recording = await recordFrames(button, 'pointerup', 6);
        await button.click();
        samples.push(...(await readFrames(recording)));
      }
      const unselected = samples.find((f) => !f.selected);
      if (!unselected) throw Error('Missing unselected endpoint');
      expect(unselected.radius).not.toBe(selected.radius);
      for (const f of samples) {
        expect(f.radius).toBe(f.selected ? selected.radius : unselected.radius);
        expect(f.corners.every((r) => parseFloat(r) > 0)).toBe(true);
      }
      await attach(info, `button-contract-selected-${kind}`, samples);
      const disabled = page.locator(
        `[data-component="${kind}"] [data-state="disabled"] button`,
      );
      await expect(disabled).toBeDisabled();
      await disabled.dispatchEvent('pointerdown', { pointerType: 'mouse' });
      expect(
        (await frames(disabled, 3)).every(
          (f) => f.transform === 'none' && f.layerOpacity === 0,
        ),
      ).toBe(true);
    }
    const square = page
      .locator('.gallery-variants button[data-shape="square"][aria-pressed]')
      .first();
    await square.scrollIntoViewIfNeeded();
    const squareRest = (await frames(square, 1))[0];
    if (!squareRest) throw Error('Missing square frame');
    const squareFrames = [];
    for (let i = 0; i < 6; i++) {
      const recording = await recordFrames(square, 'pointerup', 6);
      await square.click();
      squareFrames.push(...(await readFrames(recording)));
    }
    const squareSelected = squareFrames.find((f) => f.selected);
    if (!squareSelected) throw Error('Missing selected square frame');
    for (const f of squareFrames)
      expect([squareRest.radius, squareSelected.radius]).toContain(f.radius);
    expect(squareSelected.radius).not.toBe(squareRest.radius);
    await attach(info, 'button-contract-selected-square', squareFrames);
    await idle(page, true);
  });

  test('button contract radio and theme selections keep bounded form endpoints', async ({
    page,
  }, info) => {
    await page.goto('/m8e-calc/#/design');
    const segments = page.locator(
      '[data-component="SegmentedControl"] [data-state="default"] .ui-segment',
    );
    const segmentFrames = [];
    for (let i = 0; i < 6; i++) {
      const segment = segments.nth(i % 2);
      const outgoing = await recordFrames(segments.nth((i + 1) % 2), null, 12);
      const recording = await recordFrames(segment, 'pointerup', 6);
      await segment.click();
      segmentFrames.push(
        ...(await readFrames(recording)),
        ...(await readFrames(outgoing)),
      );
    }
    const segmentEndpoints = new Set(segmentFrames.map((f) => f.radius));
    expect(segmentEndpoints.size).toBe(2);
    expect(
      segmentFrames.every((f) => f.corners.every((r) => parseFloat(r) > 0)),
    ).toBe(true);
    await attach(info, 'button-contract-radio-selection', segmentFrames);
    const thumb = page.locator('#root .theme-thumb');
    const themeFrames = [];
    for (const value of [
      'system',
      'dark',
      'light',
      'dark',
      'system',
      'light',
    ]) {
      await page
        .locator(`#root .theme-switch input[value="${value}"]`)
        .press('Space');
      themeFrames.push(...(await frames(thumb, 6)));
    }
    expect(new Set(themeFrames.map((f) => f.radius)).size).toBe(3);
    expect(
      themeFrames.every((f) => f.corners.every((r) => parseFloat(r) > 0)),
    ).toBe(true);
    await attach(info, 'button-contract-theme-selection', themeFrames);
    await idle(page, true);
  });

  test('button contract connected targets and unmount stay stable', async ({
    page,
  }) => {
    await page.goto('/m8e-calc/#/design');
    const group = page.locator(
      '[data-component="ButtonGroup"] [data-state="default"]',
    );
    const buttons = group.locator('button');
    await buttons.first().scrollIntoViewIfNeeded();
    const before = await buttons.evaluateAll((nodes) =>
      nodes.map((n) => n.getBoundingClientRect().toJSON()),
    );
    await buttons.first().hover();
    await page.mouse.down();
    await frames(buttons.first());
    expect(
      await buttons.evaluateAll((nodes) =>
        nodes.map((n) => n.getBoundingClientRect().toJSON()),
      ),
    ).toEqual(before);
    await page.mouse.up();
    const button = page.locator(
      '[data-component="Button"] [data-state="default"] button',
    );
    await button.hover();
    const recording = await recordFrames(button, 'pointerdown', 2);
    await page.mouse.down();
    await readFrames(recording);
    const detached = await button.elementHandle();
    if (!detached) throw Error('Missing unmount subject');
    await page
      .getByRole('link', { name: 'Einfach', exact: true })
      .evaluate((node) => (node as HTMLElement).click());
    await page.mouse.up();
    await expect(button).toHaveCount(0);
    expect(
      await detached.evaluate(async (node) => {
        await new Promise(requestAnimationFrame);
        return node.getAnimations({ subtree: true }).length;
      }),
    ).toBe(0);
    await detached.dispose();
    await idle(page);
  });
}
