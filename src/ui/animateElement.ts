import { springs, springToLinear, type SpringName } from '../styles/motion';
import { supportedEasing } from '../app/browserMotion';
const curves = new Map<SpringName, ReturnType<typeof springToLinear>>();
/** Small native adapter for DOM-only springs; no animation framework on the start path. */
export function animateElement(
  node: HTMLElement,
  frames: Keyframe[],
  name: SpringName,
) {
  let curve = curves.get(name);
  if (!curve) {
    const token = springs[name];
    curve = springToLinear(token.stiffness, token.damping);
    curves.set(name, curve);
  }
  if (typeof node.animate !== 'function')
    return { finished: Promise.resolve(), stop() {} };
  const animation = node.animate(frames, {
    duration: curve.duration,
    easing: supportedEasing(curve.easing),
  });
  return {
    finished: animation.finished.catch(() => {}),
    stop: () => animation.cancel(),
  };
}
