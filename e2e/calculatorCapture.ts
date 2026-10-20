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
  return paintedColorPixels(page, png, '.calculator-value', 'color');
}

/** Shared AP19 pixel decoder: also verifies that the native focus ring is
 * actually painted above a button surface, rather than only present in CSS. */
export async function paintedColorPixels(
  page: Page,
  png: Buffer,
  selector: string,
  property: 'color' | 'outlineColor',
): Promise<number> {
  return page.evaluate(
    async ({ encoded, selector, property }) => {
      const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(
        new Blob([bytes], { type: 'image/png' }),
      );
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      const ink = document.querySelector(selector);
      if (!ctx || !ink) throw Error('Missing screenshot decoder or result');
      ctx.drawImage(bitmap, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const [red = 0, green = 0, blue = 0] = (
        getComputedStyle(ink)[property].match(/\d+/g) ?? []
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
    },
    { encoded: png.toString('base64'), selector, property },
  );
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
        const surface = node.querySelector('.ui-button-surface') ?? node;
        const layer = node.querySelector('.ui-state-layer');
        const content = node.querySelector('.ui-button-content');
        const corners = (style: CSSStyleDeclaration) => [
          style.borderTopLeftRadius,
          style.borderTopRightRadius,
          style.borderBottomRightRadius,
          style.borderBottomLeftRadius,
        ];
        for (let frame = 0; frame < count; frame++) {
          const frameTime = await new Promise<number>((resolve) =>
            requestAnimationFrame(resolve),
          );
          const started = performance.now();
          // Reuse each computed style in this sample. Re-querying animated
          // elements forces repeated compositor synchronization in WebKit.
          const style = getComputedStyle(surface);
          const host = surface === node ? style : getComputedStyle(node);
          const layerStyle = layer ? getComputedStyle(layer) : null;
          const contentStyle = content ? getComputedStyle(content) : null;
          const transform = style.transform;
          const contentLocalTransform = contentStyle?.transform ?? 'none';
          const box = node.getBoundingClientRect();
          const hit = document.elementFromPoint(
            box.left + 1,
            box.top + box.height / 2,
          );
          const visualBox = surface.getBoundingClientRect();
          const contentBox = content?.getBoundingClientRect();
          const ring =
            parseFloat(host.outlineWidth) + parseFloat(host.outlineOffset);
          let focusClipped = false;
          // There is no focus ring to clip when no outline is painted. The
          // full ancestor check still runs in every visible-focus frame.
          for (
            let parent =
              host.outlineStyle === 'none' ? null : node.parentElement;
            parent;
            parent = parent.parentElement
          ) {
            const s = getComputedStyle(parent);
            const r = parent.getBoundingClientRect();
            if (
              s.overflowX !== 'visible' &&
              (box.left - ring < r.left || box.right + ring > r.right)
            )
              focusClipped = true;
            if (
              s.overflowY !== 'visible' &&
              (box.top - ring < r.top || box.bottom + ring > r.bottom)
            )
              focusClipped = true;
          }
          const sample = {
            frameTime,
            time: performance.now(),
            radius: style.borderRadius,
            corners: corners(style),
            hostCorners: corners(host),
            layerCorners: layerStyle ? corners(layerStyle) : [],
            contentCorners: contentStyle ? corners(contentStyle) : [],
            contentSharesSurface: content?.parentElement === surface,
            contentLocalTransform,
            // An untransformed direct child receives precisely its parent's
            // transform. Keep the browser's sampled serialization: multiplying
            // an identity DOMMatrix in Firefox converts it to float32.
            contentTransform:
              content?.parentElement === surface &&
              contentLocalTransform === 'none'
                ? transform
                : contentLocalTransform,
            layerOpacity: layerStyle ? Number(layerStyle.opacity) : 0,
            clip: style.overflow,
            hostTransform: host.transform,
            box: { x: box.x, y: box.y, width: box.width, height: box.height },
            hit: hit === node || (hit !== null && node.contains(hit)),
            selected: node.hasAttribute('data-selected'),
            pressed: node.hasAttribute('data-pressed'),
            transform,
            width: (node as HTMLElement).offsetWidth,
            height: (node as HTMLElement).offsetHeight,
            outline: host.outlineStyle,
            outlineOffset: host.outlineOffset,
            focusClipped,
            contentInsideSurface:
              !contentBox ||
              (contentBox.left >= visualBox.left - 1 &&
                contentBox.right <= visualBox.right + 1 &&
                contentBox.top >= visualBox.top - 1 &&
                contentBox.bottom <= visualBox.bottom + 1),
            background: style.backgroundColor,
          };
          result.push({ ...sample, captureMs: performance.now() - started });
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
