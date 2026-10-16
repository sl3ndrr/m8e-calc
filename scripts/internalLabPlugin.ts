import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

/** Fail closed if an internal entry leaks through a new import path. */
export function internalLabPlugin(internalLab: boolean): Plugin {
  let root = '';
  const exclusive =
    /(?:\/app\/(?:DesignLab|ComponentGallery|galleryEntries|internalLabLink\.css|ComponentGallery\.css)|\/ui\/MotionDemo|\/styles\/designLab\.css|\/i18n\/lab(?:DE|EN))\b/;
  return {
    name: 'm8e-internal-lab-boundary',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle)
        .filter((file) => file.type === 'chunk')
        .map((file) => ({
          file: file.fileName,
          imports: file.imports,
          dynamicImports: file.dynamicImports,
          modules: Object.entries(file.modules)
            .filter(([, details]) => details.renderedLength > 0)
            .map(([id]) => id.replace(root + '/', '')),
        }));
      const modules = chunks.flatMap((chunk) => chunk.modules);
      if (!internalLab && modules.some((id) => exclusive.test('/' + id)))
        this.error('Internal design lab module leaked into the normal build');
      if (internalLab && !modules.some((id) => id.endsWith('/DesignLab.tsx')))
        this.error('Gallery build is missing DesignLab');
      this.emitFile({
        type: 'asset',
        fileName: 'build-target.json',
        source: JSON.stringify({ target: internalLab ? 'gallery' : 'normal' }),
      });
      mkdirSync(resolve(root, 'test-results/ap23'), { recursive: true });
      writeFileSync(
        resolve(
          root,
          `test-results/ap23/modules-${internalLab ? 'gallery' : 'normal'}.json`,
        ),
        JSON.stringify(chunks, null, 2),
      );
    },
  };
}
