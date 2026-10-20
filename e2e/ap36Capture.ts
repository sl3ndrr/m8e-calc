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
      holdTime: 40,
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
        animation.currentTime = probe.holdTime;
      });
    };
    document.addEventListener(
      'click',
      () => {
        if (!probe.freezeFrames || !probe.selector || probe.suspended) return;
        let count = 0;
        const initial = document.querySelector(probe.selector);
        const initialStyle = initial ? getComputedStyle(initial) : null;
        const initialValue = initialStyle
          ? `${initialStyle.transform}/${initialStyle.opacity}`
          : null;
        let waiting = 0;
        const capture = (time: number) => {
          const node = document.querySelector(probe.selector);
          if (!node) {
            raf(capture);
            return;
          }
          const style = getComputedStyle(node);
          // WebKit can use Motion's JS fallback. Do not freeze before that
          // fallback has rendered its first changed value (Off stays neutral).
          if (
            !count &&
            document.documentElement.dataset.motion !== 'off' &&
            initialValue === `${style.transform}/${style.opacity}` &&
            ++waiting < 30
          ) {
            raf(capture);
            return;
          }
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
            animation.currentTime = probe.holdTime;
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
          // A dormant hold probe must not synchronize native animations.
          // Only inspect the explicitly armed subject (the live recorder is
          // deliberately independent of the held-image mechanism).
          if (
            probe.selector &&
            event.target instanceof Element &&
            event.target.matches(probe.selector)
          )
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
  holdTime: number;
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
  holdTime = 40,
) {
  await page.evaluate(
    ({ selector, freezeFrames, holdTime }) => {
      const probe = Reflect.get(window, 'ap36Probe') as Probe;
      probe.selector = selector;
      probe.holdTime = holdTime;
      probe.held = [];
      probe.freezeFrames = freezeFrames;
      probe.live = [];
    },
    { selector, freezeFrames, holdTime },
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
              (galleryLoaders &&
              document.documentElement.dataset.motion === 'full'
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

/** Drive the real React-Aria motion selector inside the browser so RPC/stability
 * waits cannot postpone Off until after the short spring has already ended. */
export async function armLiveOff(select: Locator, selector: string) {
  return select.evaluateHandle((button, selector) => {
    const read = () => {
      const node = document.querySelector(selector);
      if (!node) throw new Error('Missing live animation subject');
      const style = getComputedStyle(node);
      return {
        time: performance.now(),
        opacity: Number(style.opacity),
        transform: style.transform,
        translate: style.translate,
        scale: style.scale,
        animations: node
          .getAnimations()
          .filter((a) => a.playState === 'running' || a.playState === 'paused')
          .length,
      };
    };
    type Frame = ReturnType<typeof read>;
    const done = new Promise<{ before: Frame[]; after: Frame[] }>(
      (resolve, reject) => {
        const before: Frame[] = [];
        const after: Frame[] = [];
        let waiting = 0;
        let switched = false;
        let observer: MutationObserver | undefined;
        const chooseOff = () => {
          const option = Array.from(
            document.querySelectorAll<HTMLElement>('[role="option"]'),
          ).find((node) => node.textContent?.trim() === 'Aus');
          if (!option) return;
          before.push(read());
          switched = true;
          observer?.disconnect();
          option.click();
        };
        const tick = () => {
          try {
            const frame = read();
            if (switched) {
              after.push(frame);
              if (after.length === 12) {
                resolve({ before, after });
                return;
              }
            } else if (
              !before.length &&
              frame.animations &&
              frame.opacity > 0 &&
              frame.opacity < 1
            ) {
              before.push(frame);
              // Select as soon as React mounts the menu. Waiting several rAFs
              // loses short Reduced springs on WebKit under trace capture.
              observer = new MutationObserver(chooseOff);
              observer.observe(document.body, {
                childList: true,
                subtree: true,
              });
              (button as HTMLElement).click();
              chooseOff();
            } else if (++waiting > 60) {
              observer?.disconnect();
              reject(new Error('No live Motion entrance/Off menu'));
              return;
            }
            requestAnimationFrame(tick);
          } catch (error) {
            observer?.disconnect();
            reject(error);
          }
        };
        requestAnimationFrame(tick);
      },
    );
    return { done };
  }, selector);
}
