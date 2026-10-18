import type { Plugin } from 'vite';

/** Passive network-only provenance; pwaPlugin bypasses caches for direct inspection.
 * The app never requests this file. */
export function buildInfoPlugin(internalLab: boolean): Plugin {
  return {
    name: 'm8e-build-info',
    apply: 'build',
    // Run after the PWA plugin so provenance stays outside its cache/request set.
    enforce: 'post',
    generateBundle() {
      const sha = process.env.GITHUB_SHA;
      this.emitFile({
        type: 'asset',
        fileName: 'build-info.json',
        source: JSON.stringify({
          schemaVersion: 1,
          sourceCommit: sha && /^[a-f0-9]{40}$/i.test(sha) ? sha : null,
          target: internalLab ? 'gallery' : 'normal',
        }),
      });
    },
  };
}
