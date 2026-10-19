import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';

export async function installMotionProbe(page: Page) {
  await page.addInitScript(() => {
    const probe = {
      selector: '',
      held: [] as Animation[],
      frames: new Set<number>(),
    };
    Object.assign(window, { ap36Probe: probe });
    const raf = requestAnimationFrame.bind(window);
    const cancel = cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      const id = raf((time) => {
        probe.frames.delete(id);
        callback(time);
      });
      probe.frames.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      probe.frames.delete(id);
      cancel(id);
    };
    const hold = (element: Element, animation: Animation) => {
      if (!probe.selector || !element.matches(probe.selector)) return;
      animation.pause();
      animation.currentTime =
        Number(animation.effect?.getTiming().duration) / 3;
      probe.held.push(animation);
    };
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options);
      hold(this, animation);
      return animation;
    };
    for (const name of ['animationstart', 'transitionrun'])
      document.addEventListener(
        name,
        (event) => {
          if (event.target instanceof Element)
            for (const animation of event.target.getAnimations())
              hold(event.target, animation);
        },
        true,
      );
  });
}

interface Probe {
  selector: string;
  held: Animation[];
  frames: Set<number>;
}
export async function holdNext(page: Page, selector: string) {
  await page.evaluate((selector) => {
    const probe = Reflect.get(window, 'ap36Probe') as Probe;
    probe.selector = selector;
    probe.held = [];
  }, selector);
}
export async function held(page: Page) {
  return page.evaluate(() => {
    const probe = Reflect.get(window, 'ap36Probe') as Probe;
    return probe.held.map((a) => ({
      state: a.playState,
      time: a.currentTime,
      duration: a.effect?.getTiming().duration,
      frames: a.effect instanceof KeyframeEffect ? a.effect.getKeyframes() : [],
    }));
  });
}
export async function resume(page: Page) {
  await page.evaluate(() => {
    const probe = Reflect.get(window, 'ap36Probe') as Probe;
    probe.selector = '';
    for (const animation of probe.held)
      if (animation.playState === 'paused') animation.play();
    probe.held = [];
  });
}
export async function sampleFrames(locator: Locator, count = 12) {
  return locator.evaluate(async (node, count) => {
    const samples = [];
    for (let i = 0; i < count; i++) {
      await new Promise(requestAnimationFrame);
      const s = getComputedStyle(node);
      samples.push({
        time: performance.now(),
        transform: s.transform,
        translate: s.translate,
        scale: s.scale,
        opacity: Number(s.opacity),
        radius: s.borderRadius,
        connected: node.isConnected,
        animations: node
          .getAnimations()
          .filter((a) => a.playState !== 'finished').length,
      });
    }
    return samples;
  }, count);
}
export async function idle(page: Page, galleryLoaders = false) {
  await expect
    .poll(() =>
      page.evaluate((galleryLoaders) => {
        const probe = Reflect.get(window, 'ap36Probe') as Probe;
        return {
          frames: Math.max(
            0,
            probe.frames.size -
              (galleryLoaders
                ? document.querySelectorAll('.ui-loading').length
                : 0),
          ),
          animations: document
            .getAnimations()
            .filter(
              (a) => a.playState === 'running' || a.playState === 'paused',
            ).length,
        };
      }, galleryLoaders),
    )
    .toEqual({ frames: 0, animations: 0 });
}
export async function attach(info: TestInfo, name: string, data: unknown) {
  await info.attach(name, {
    body: JSON.stringify(data, null, 2),
    contentType: 'application/json',
  });
}
export async function picture(info: TestInfo, name: string, locator: Locator) {
  await info.attach(name, {
    body: await locator.screenshot({ animations: 'allow' }),
    contentType: 'image/png',
  });
}
