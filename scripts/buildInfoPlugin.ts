import type { Plugin } from 'vite';

/** Passive provenance for direct inspection; the app never requests this file. */
export function buildInfoPlugin(internalLab: boolean): Plugin {
  return {
    name: 'm8e-build-info',
    apply: 'build',
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
