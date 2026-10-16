import { expect, test, type Page, type Locator } from '@playwright/test';

async function ready(page: Page) {
  await page.locator('.calculator-value').waitFor();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check('550 100px "Roboto Flex"')),
  ).toBe(true);
}
async function settle(locator: Locator) {
  await locator.evaluate(async (node) => {
    await Promise.all(
      node
        .getAnimations({ subtree: true })
        .map((a) => a.finished.catch(() => {})),
    );
  });
}
async function frames(button: Locator, count = 12) {
  return button.evaluate(async (node, count) => {
    const samples = [];
    for (let frame = 0; frame < count; frame++) {
      await new Promise(requestAnimationFrame);
      const style = getComputedStyle(node);
      samples.push({
        radius: style.borderRadius,
        transform: style.transform,
        width: (node as HTMLElement).offsetWidth,
        height: (node as HTMLElement).offsetHeight,
        outline: style.outlineStyle,
        background: style.backgroundColor,
      });
    }
    return samples;
  }, count);
}

// Browser-zoom-equivalent layout viewport and DPR. Physical/browser UI zoom
// remains a manual platform check; CSS zoom and disabled-animation pictures
// are deliberately not used as substitutes for the moving-frame assertions.
for (const [width, height, zoom, uiSize, theme, language] of [
  [1920, 1080, 1, 80, 'light', 'de'],
  [1920, 1080, 1.25, 100, 'dark', 'en'],
  [1920, 1080, 1.5, 150, 'light', 'en'],
  [1920, 1080, 2, 100, 'dark', 'de'],
  [1280, 900, 1, 150, 'dark', 'en'],
  [1280, 900, 2, 150, 'light', 'de'],
  [3840, 2160, 1, 100, 'light', 'de'],
  [3840, 2160, 2, 80, 'dark', 'en'],
] as const) {
  test(`ink ${width} zoom ${zoom} UI ${uiSize} ${theme} ${language}`, async ({
    browser,
  }, info) => {
    const context = await browser.newContext({
      baseURL: info.project.use.baseURL,
      viewport: {
        width: Math.round(width / zoom),
        height: Math.round(height / zoom),
      },
      deviceScaleFactor: zoom,
      locale: language === 'de' ? 'de-DE' : 'en-US',
    });
    await context.addInitScript(
      ({ uiSize, themeMode, language }) => {
        localStorage.setItem(
          'm8e-calc.settings',
          JSON.stringify({
            version: 4,
            state: {
              uiSize,
              themeMode,
              language,
              motionLevel: 'full',
              grouping: uiSize !== 80,
              decimalSeparator: 'auto',
            },
          }),
        );
      },
      { uiSize, themeMode: theme, language },
    );
    const page = await context.newPage();
    await page.goto('/m8e-calc/#/simple');
    await ready(page);
    const viewport = page.locator('.calculator-viewport');
    const heightBefore = await viewport.evaluate((n) => n.clientHeight);
    test.slow();
    const measurements = [];
    for (const sequence of [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '1/3=',
      '1234567890123456',
      '9999999999999999+1=',
      '0.000000001*0.000000001=',
    ]) {
      await page.keyboard.press('Escape');
      await page.keyboard.type(sequence);
      if (sequence === '1234567890123456')
        await page.locator('[data-key="sign"] button').click();
      await settle(viewport);
      const value = await page
        .locator('.calculator-announcement')
        .textContent();
      await expect(page.locator('.calculator-value')).toHaveText(value ?? '');
      const metrics = await viewport.evaluate((node) => {
        const ink = node.querySelector('.calculator-value');
        if (!(ink instanceof HTMLElement)) throw Error('Missing value');
        const style = getComputedStyle(ink),
          box = node.getBoundingClientRect();
        const cells = Array.from(
          ink.querySelectorAll('.calculator-character'),
        ).map((c) => c.getBoundingClientRect());
        return {
          fontSize: parseFloat(style.fontSize),
          width: box.width,
          height: node.clientHeight,
          fits: cells.every(
            (c) =>
              c.left >= box.left - 0.6 &&
              c.right <= box.right + 0.6 &&
              c.top >= box.top - 0.6 &&
              c.bottom <= box.bottom + 0.6,
          ),
          wraps: new Set(cells.map((c) => Math.round(c.top))).size > 1,
          measured: node
            .querySelector('.calculator-measure')
            ?.getBoundingClientRect().width,
          advanceSum: Array.from(
            ink.querySelectorAll('.calculator-character'),
          ).reduce(
            (sum, c) =>
              sum +
              c.getBoundingClientRect().width +
              parseFloat(getComputedStyle(c).marginLeft) +
              parseFloat(getComputedStyle(c).marginRight),
            0,
          ),
        };
      });
      expect(metrics.fontSize).toBeGreaterThanOrEqual(24);
      expect(metrics.height).toBe(heightBefore);
      expect(metrics.fits, `${sequence}: ${JSON.stringify(metrics)}`).toBe(
        true,
      );
      // Pixel oracle: revealing character ink must not change a single pixel.
      // This catches the original 9 even though DOM advance boxes fitted.
      const clipped = await viewport.screenshot();
      const override = await page.addStyleTag({
        content: '.calculator-character { overflow: visible !important; }',
      });
      const revealed = await viewport.screenshot();
      await override.evaluate((n) => n.parentNode?.removeChild(n));
      expect(clipped.equals(revealed), `clipped ink: ${value}`).toBe(true);
      measurements.push({ sequence, value, ...metrics });
      if (
        sequence === '9' ||
        sequence === '1/3=' ||
        sequence === '1234567890123456'
      ) {
        await info.attach(`display-${sequence.replaceAll('/', '-')}`, {
          body: clipped,
          contentType: 'image/png',
        });
      }
    }
    await info.attach('measurements', {
      body: JSON.stringify(measurements, null, 2),
      contentType: 'application/json',
    });
    await info.attach('desktop', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    await context.close();
  });
}

test('operator shapes survive live mouse, global keyboard and React Aria press frames', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/m8e-calc/#/simple');
  await ready(page);
  const evidence = [];
  for (const [id, key] of [
    ['+', '+'],
    ['-', '-'],
    ['*', '*'],
    ['/', '/'],
    ['equals', 'Enter'],
  ] as const) {
    const button = page.locator(`[data-key="${id}"] button`);
    await settle(button);
    const baseline = (await frames(button, 1))[0];
    expect(baseline).toBeDefined();
    const assertShape = (samples: Awaited<ReturnType<typeof frames>>) => {
      for (const sample of samples) {
        expect(sample.radius).toBe(baseline?.radius);
        expect(sample.width).toBe(baseline?.width);
        expect(sample.height).toBe(baseline?.height);
      }
    };
    for (let repeat = 0; repeat < 2; repeat++) {
      await button.hover();
      await page.mouse.down();
      await expect(button).toHaveAttribute('data-pressed');
      const down = await frames(button);
      assertShape(down);
      expect(down.some((f) => f.transform !== 'none')).toBe(true);
      // Capture an actual CSS transition at its middle, using the browser's
      // animation clock, then resume it. Live rAF samples above are independent.
      await button.evaluate((node) => {
        for (const animation of node.getAnimations()) {
          animation.pause();
          animation.currentTime =
            Number(animation.effect?.getTiming().duration) / 2;
        }
      });
      if (!repeat)
        await info.attach(`mouse-${id === '/' ? 'divide' : id}`, {
          body: await page.screenshot(),
          contentType: 'image/png',
        });
      await button.evaluate((node) =>
        node.getAnimations().forEach((a) => a.play()),
      );
      await page.mouse.up();
      const up = await frames(button);
      assertShape(up);
      if (id !== 'equals') {
        await expect(page.locator(`[data-key="${id}"]`)).toHaveAttribute(
          'data-active',
        );
        expect(up.at(-1)?.background).not.toBe(baseline?.background);
      }
      await settle(button);
      await page.locator('.simple-memory').click();
      await page.keyboard.down(key);
      await expect(page.locator(`[data-key="${id}"]`)).toHaveAttribute(
        'data-key-pressed',
      );
      const keyboard = await frames(button);
      assertShape(keyboard);
      await page.keyboard.down(key); // held/repeated keydown
      await page.keyboard.up(key);
      assertShape(await frames(button));
      evidence.push({ id, repeat, down, up, keyboard });
    }
    // Focused Space exercises React Aria rather than the global command map.
    await button.focus();
    await page.keyboard.down('Space');
    await expect(button).toHaveAttribute('data-pressed');
    const focused = await frames(button);
    assertShape(focused);
    expect(focused.every((f) => f.outline === 'solid')).toBe(true);
    await page.keyboard.up('Space');
    assertShape(await frames(button));
  }
  await page.locator('.simple-memory').click();
  await page.keyboard.press('Escape');
  await page.keyboard.type('1+-*/+-*/2=');
  await expect(page.locator('.calculator-announcement')).toHaveText('0,5');
  await info.attach('live-frames', {
    body: JSON.stringify(evidence, null, 2),
    contentType: 'application/json',
  });
});

for (const [motion, reduced] of [
  ['full', false],
  ['reduced', false],
  ['off', false],
  ['full', true],
  ['off', true],
] as const) {
  test(`motion ${motion} OS reduced ${reduced}: digits, release and scientific keypad`, async ({
    page,
  }, info) => {
    await page.emulateMedia({
      reducedMotion: reduced ? 'reduce' : 'no-preference',
    });
    await page.addInitScript(
      (motionLevel) =>
        localStorage.setItem(
          'm8e-calc.settings',
          JSON.stringify({ version: 4, state: { motionLevel } }),
        ),
      motion,
    );
    await page.goto('/m8e-calc/#/simple');
    await ready(page);
    const viewport = page.locator('.calculator-viewport');
    await settle(viewport);
    await page.evaluate(() => {
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        const animation = animate.call(this, frames, options);
        if (this.parentElement?.classList.contains('calculator-character'))
          animation.pause();
        return animation;
      };
    });
    await page.keyboard.press('9');
    const digit = await viewport.evaluate((node) =>
      node.getAnimations({ subtree: true }).map((a) => ({
        frames:
          a.effect instanceof KeyframeEffect ? a.effect.getKeyframes() : [],
        duration: a.effect?.getTiming().duration,
      })),
    );
    if (motion === 'off') expect(digit).toEqual([]);
    else {
      expect(digit.length).toBeGreaterThan(0);
      expect(
        digit.some((a) =>
          a.frames.some((f) => String(f.transform).includes('translateY')),
        ),
      ).toBe(motion === 'full' && !reduced);
    }
    await viewport.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((a) => {
        a.pause();
        a.currentTime = Number(a.effect?.getTiming().duration) / 2;
      }),
    );
    await info.attach('digit-middle', {
      body: await viewport.screenshot(),
      contentType: 'image/png',
    });
    await viewport.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((a) => a.play()),
    );
    await settle(viewport);
    for (const mode of ['simple', 'scientific']) {
      await page.goto(`/m8e-calc/#/${mode}`);
      const target = page.locator(`[data-key="+"] button`);
      await expect(target).toBeVisible();
      const rest = (await frames(target, 1))[0];
      await target.hover();
      await page.mouse.down();
      await expect(target).toHaveAttribute('data-pressed');
      const down = await frames(target);
      await page.mouse.up();
      const up = await frames(target);
      for (const f of [...down, ...up]) {
        expect(f.radius).toBe(rest?.radius);
        if (motion !== 'full' || reduced) expect(f.transform).toBe('none');
      }
      if (motion === 'off')
        expect(
          await target.evaluate(
            (node) => node.getAnimations({ subtree: true }).length,
          ),
        ).toBe(0);
    }
  });
}

for (const language of ['de', 'en'] as const) {
  test(`copy and accessible numeric output retain exact ${language} content`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          'm8e-calc.settings',
          JSON.stringify({ version: 4, state: { language } }),
        ),
      language,
    );
    await page.goto('/m8e-calc/#/simple');
    await ready(page);
    await page.keyboard.type('1/3=');
    const output = page.locator('.calculator-announcement');
    await expect(output).toHaveText(
      language === 'de' ? '0,333333333333333' : '0.333333333333333',
    );
    await expect(output).toHaveAttribute('aria-live', 'polite');
    await expect(output).toHaveAttribute('aria-atomic', 'true');
    await page.locator('.calculator-result').click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      await output.textContent(),
    );
  });
}

test('switching Full to OS Reduced and Off cancels an in-flight digit', async ({
  page,
}) => {
  await page.goto('/m8e-calc/#/simple');
  await ready(page);
  const viewport = page.locator('.calculator-viewport');
  await settle(viewport);
  await page.evaluate(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options);
      if (this.parentElement?.classList.contains('calculator-character')) {
        animation.pause();
        animation.currentTime =
          Number(animation.effect?.getTiming().duration) / 2;
      }
      return animation;
    };
  });
  await page.keyboard.press('9');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() =>
      viewport.evaluate((node) =>
        node
          .getAnimations({ subtree: true })
          .every(
            (a) =>
              a.effect instanceof KeyframeEffect &&
              a.effect.getKeyframes().every((f) => f.transform === undefined),
          ),
      ),
    )
    .toBe(true);
  await page
    .getByRole('button', { name: 'Einstellungen', exact: true })
    .click();
  await page.getByRole('button', { name: /Animationsstufe/ }).click();
  await page.getByRole('option', { name: 'Aus', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await expect
    .poll(() =>
      viewport.evaluate((node) => node.getAnimations({ subtree: true }).length),
    )
    .toBe(0);
  await page.keyboard.press('Escape');
  const button = page.locator('[data-key="+"] button');
  await button.hover();
  await page.mouse.down();
  await page.mouse.up();
  expect((await frames(button)).every((f) => f.transform === 'none')).toBe(
    true,
  );
});
