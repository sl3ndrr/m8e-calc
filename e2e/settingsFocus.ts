import { expect, type Locator, type Page } from '@playwright/test';
import { tabTo } from './qa-setup';

interface FocusSample {
  backwards: boolean;
  name: string | null;
  rect: { top: number; bottom: number; left: number; right: number };
  ring: number;
  fullyVisible: boolean;
  belowHeader: boolean;
  headerVisible: boolean;
  noHorizontalOverflow: boolean;
}

/** Native Tab traversal must expose the painted control and its whole ring. */
export async function checkSettingsFocus(
  page: Page,
  dialog: Locator,
): Promise<FocusSample[]> {
  const controls: Locator[] = [];
  for (const node of await dialog.locator('button, input, [tabindex]').all()) {
    if (
      await node.evaluate(
        (element) =>
          element instanceof HTMLElement &&
          element.tabIndex >= 0 &&
          element.getAttribute('aria-hidden') !== 'true' &&
          element.getClientRects().length > 0,
      )
    )
      controls.push(node);
  }
  expect(controls.length).toBeGreaterThan(10);
  const samples: FocusSample[] = [];
  for (const backwards of [false, true]) {
    for (const control of backwards ? [...controls].reverse() : controls) {
      await tabTo(page, control, backwards);
      const sample = await control.evaluate((element) => {
        const visual =
          element.closest('.ui-text-input, .ui-slider-thumb, .ui-switch') ??
          element;
        const content = element.closest('.ui-dialog-content');
        const boundary = content ?? element.closest('.ui-dialog-header');
        if (!boundary) throw new Error('Settings focus has no layout boundary');
        const rect = visual.getBoundingClientRect();
        const clip = boundary.getBoundingClientRect();
        const style = getComputedStyle(visual);
        const ring =
          style.outlineStyle === 'none'
            ? 0
            : parseFloat(style.outlineWidth) +
              Math.max(0, parseFloat(style.outlineOffset));
        const header = document
          .querySelector('.settings-dialog .ui-dialog-header')
          ?.getBoundingClientRect();
        if (!header) throw new Error('Settings header missing');
        return {
          name: element.getAttribute('aria-label') ?? element.textContent,
          rect: {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
          },
          ring,
          fullyVisible:
            rect.top - ring >= clip.top &&
            rect.bottom + ring <= clip.bottom &&
            rect.left - ring >= clip.left &&
            rect.right + ring <= clip.right,
          belowHeader: !content || rect.top - ring >= header.bottom,
          headerVisible: header.top >= 0 && header.bottom <= innerHeight,
          noHorizontalOverflow: boundary.scrollWidth <= boundary.clientWidth,
        };
      });
      samples.push({ backwards, ...sample });
      expect(sample.fullyVisible, JSON.stringify(sample)).toBe(true);
      expect(sample.belowHeader, JSON.stringify(sample)).toBe(true);
      expect(sample.headerVisible).toBe(true);
      expect(sample.noHorizontalOverflow).toBe(true);
    }
  }
  return samples;
}
