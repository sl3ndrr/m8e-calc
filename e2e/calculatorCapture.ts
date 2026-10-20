import {
  expect,
  type CDPSession,
  type Locator,
  type Page,
} from '@playwright/test';

/** Scroll the ink, which can be shorter than its viewport on short windows.
 * Native zoom uses DIP coordinates in CDP; device emulation uses CSS DIP. */
export async function captureCalculatorValue(
  viewport: Locator,
  cdp?: CDPSession,
): Promise<Buffer> {
  await viewport.locator('.calculator-value').scrollIntoViewIfNeeded();
  const visible = await viewport
    .locator('.calculator-value')
    .evaluate((ink) => {
      let left = 0,
        top = 0,
        right = innerWidth,
        bottom = innerHeight;
      for (
        let parent = ink.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        const style = getComputedStyle(parent);
        const box = parent.getBoundingClientRect();
        if (style.overflowX !== 'visible') {
          left = Math.max(left, box.left);
          right = Math.min(right, box.right);
        }
        if (style.overflowY !== 'visible') {
          top = Math.max(top, box.top);
          bottom = Math.min(bottom, box.bottom);
        }
      }
      return Array.from(ink.querySelectorAll('.calculator-character')).every(
        (cell) => {
          const box = cell.getBoundingClientRect();
          return (
            box.left >= left - 0.6 &&
            box.right <= right + 0.6 &&
            box.top >= top - 0.6 &&
            box.bottom <= bottom + 0.6
          );
        },
      );
    });
  expect(
    visible,
    'complete character boxes inside all ancestor clips and window',
  ).toBe(true);
  const rect = await viewport.evaluate((node) => {
    const r = node.getBoundingClientRect();
    return {
      x: r.left + scrollX,
      y: r.top + scrollY,
      width: r.width,
      height: r.height,
    };
  });
  if (!cdp) return viewport.screenshot({ animations: 'allow' });
  const layout = await cdp.send('Page.getLayoutMetrics');
  const scale =
    layout.layoutViewport.clientWidth / layout.cssLayoutViewport.clientWidth;
  const result = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: {
      x: rect.x * scale,
      y: rect.y * scale,
      width: rect.width * scale,
      height: rect.height * scale,
      scale: 1,
    },
  });
  return Buffer.from(result.data, 'base64');
}

/** A blank or unrelated crop must not pass the with/without-clip pixel oracle. */
export async function calculatorInkPixels(
  page: Page,
  png: Buffer,
): Promise<number> {
  return page.evaluate(async (encoded) => {
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(
      new Blob([bytes], { type: 'image/png' }),
    );
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    const ink = document.querySelector('.calculator-value');
    if (!ctx || !ink) throw Error('Missing screenshot decoder or result');
    ctx.drawImage(bitmap, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const [red = 0, green = 0, blue = 0] = (
      getComputedStyle(ink).color.match(/\d+/g) ?? []
    ).map(Number);
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (
        (pixels[i + 3] ?? 0) > 240 &&
        Math.abs((pixels[i] ?? 0) - red) < 8 &&
        Math.abs((pixels[i + 1] ?? 0) - green) < 8 &&
        Math.abs((pixels[i + 2] ?? 0) - blue) < 8
      )
        count++;
    }
    bitmap.close();
    return count;
  }, png.toString('base64'));
}

export async function recordFrames(
  button: Locator,
  event: 'pointerdown' | 'pointerup' | 'keydown' | 'keyup' | null,
  count = 12,
) {
  // Arm the browser-side recorder before input. Resolving a Locator after the
  // event can consume most of the 421-ms transition on a loaded CI runner.
  return button.evaluateHandle(
    (node, { event, count }) => {
      const samples = (async () => {
        if (event)
          await new Promise<void>((resolve) =>
            node.addEventListener(event, () => resolve(), { once: true }),
          );
        const result = [];
        for (let frame = 0; frame < count; frame++) {
          await new Promise(requestAnimationFrame);
          const surface = node.querySelector('.ui-button-surface') ?? node;
          const style = getComputedStyle(surface);
          const host = getComputedStyle(node);
          const layer = node.querySelector('.ui-state-layer');
          const content = node.querySelector('.ui-button-content');
          const box = node.getBoundingClientRect();
          const hit = document.elementFromPoint(box.left + 1, box.top + box.height / 2);
          const visualBox = surface.getBoundingClientRect();
          const contentBox = content?.getBoundingClientRect();
          const ring = parseFloat(host.outlineWidth) + parseFloat(host.outlineOffset);
          let focusClipped = false;
          for (let parent = node.parentElement; parent; parent = parent.parentElement) {
            const s = getComputedStyle(parent);
            const r = parent.getBoundingClientRect();
            if (s.overflowX !== 'visible' && (box.left - ring < r.left || box.right + ring > r.right)) focusClipped = true;
            if (s.overflowY !== 'visible' && (box.top - ring < r.top || box.bottom + ring > r.bottom)) focusClipped = true;
          }
          const corners = (element: Element) => {
            const s = getComputedStyle(element);
            return [s.borderTopLeftRadius, s.borderTopRightRadius,
              s.borderBottomRightRadius, s.borderBottomLeftRadius];
          };
          result.push({
            time: performance.now(),
            radius: style.borderRadius,
            corners: corners(surface),
            hostCorners: corners(node),
            layerCorners: layer ? corners(layer) : [],
            contentCorners: content ? corners(content) : [],
            contentTransform: content
              ? getComputedStyle(content).transform
              : 'none',
            layerOpacity: layer ? Number(getComputedStyle(layer).opacity) : 0,
            clip: style.overflow,
            hostTransform: host.transform,
            box: { x: box.x, y: box.y, width: box.width, height: box.height },
            hit: hit === node || (hit !== null && node.contains(hit)),
            selected: node.hasAttribute('data-selected'),
            pressed: node.hasAttribute('data-pressed'),
            transform: style.transform,
            width: (node as HTMLElement).offsetWidth,
            height: (node as HTMLElement).offsetHeight,
            outline: host.outlineStyle,
            outlineOffset: host.outlineOffset,
            focusClipped,
            contentInsideSurface: !contentBox || (contentBox.left >= visualBox.left - 1 && contentBox.right <= visualBox.right + 1 && contentBox.top >= visualBox.top - 1 && contentBox.bottom <= visualBox.bottom + 1),
            background: style.backgroundColor,
          });
        }
        return result;
      })();
      return { samples };
    },
    { event, count },
  );
}
export async function readFrames(
  recording: Awaited<ReturnType<typeof recordFrames>>,
) {
  try {
    return await recording.evaluate(({ samples }) => samples);
  } finally {
    await recording.dispose();
  }
}
export async function frames(button: Locator, count = 12) {
  return readFrames(await recordFrames(button, null, count));
}
