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
      freezeFrames: false,
      suspended: false,
      waiting: new Map<number, FrameRequestCallback>(),
      live: [] as { time: number; transform: string; opacity: string }[],
      held: [] as Animation[],
      frames: new Set<number>(),
    };
    Object.assign(window, { ap36Probe: probe });
    const raf = requestAnimationFrame.bind(window);
    const cancel = cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      const id = raf((time) => {
        if (probe.suspended) {
          probe.waiting.set(id, callback);
          return;
        }
        probe.frames.delete(id);
        callback(time);
      });
      probe.frames.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      probe.frames.delete(id);
      probe.waiting.delete(id);
      cancel(id);
    };
    const hold = (element: Element, animation: Animation) => {
      if (!probe.selector || !element.matches(probe.selector)) return;
      probe.held.push(animation);
      if (probe.freezeFrames) return;
      queueMicrotask(() => {
        animation.pause();
        animation.currentTime = 40;
      });
    };
    document.addEventListener(
      'click',
      () => {
        if (!probe.freezeFrames || !probe.selector || probe.suspended) return;
        let count = 0;
        const capture = (time: number) => {
          const node = document.querySelector(probe.selector);
          if (!node) {
            raf(capture);
            return;
          }
          const style = getComputedStyle(node);
          probe.live.push({
            time,
            transform: style.transform,
            opacity: style.opacity,
          });
          if (++count < 3) {
            raf(capture);
            return;
          }
          // Hold app callbacks without changing performance.now or the native
          // document timeline. The independent frame recorder above stays real.
          probe.suspended = true;
          probe.held = Array.from(node.getAnimations());
          for (const animation of probe.held) {
            animation.pause();
            animation.currentTime = 40;
          }
        };
        raf(capture);
      },
      true,
    );
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
  freezeFrames: boolean;
  suspended: boolean;
  waiting: Map<number, FrameRequestCallback>;
  live: { time: number; transform: string; opacity: string }[];
  held: Animation[];
  frames: Set<number>;
}
export async function holdNext(
  page: Page,
  selector: string,
  freezeFrames = false,
) {
  await page.evaluate(
    ({ selector, freezeFrames }) => {
      const probe = Reflect.get(window, 'ap36Probe') as Probe;
      probe.selector = selector;
      probe.held = [];
      probe.freezeFrames = freezeFrames;
      probe.live = [];
    },
    { selector, freezeFrames },
  );
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
    probe.freezeFrames = false;
    for (const animation of probe.held)
      if (animation.playState === 'paused') animation.play();
    probe.held = [];
    probe.suspended = false;
    const pending = [...probe.waiting];
    probe.waiting.clear();
    for (const [id, callback] of pending) {
      if (probe.frames.delete(id)) callback(performance.now());
    }
  });
}
export async function waitFrozen(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => (Reflect.get(window, 'ap36Probe') as Probe).suspended,
      ),
    )
    .toBe(true);
  return page.evaluate(() => (Reflect.get(window, 'ap36Probe') as Probe).live);
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
              (a) =>
                (a.playState === 'running' || a.playState === 'paused') &&
                a.effect?.getTiming().iterations !== Infinity,
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
