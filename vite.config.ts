import { defineConfig } from 'vitest/config';
import { internalLabPlugin } from './scripts/internalLabPlugin.ts';
import { localePlugin } from './scripts/localePlugin.ts';
import { cspPlugin } from './scripts/cspPlugin.ts';
import react from '@vitejs/plugin-react';
import { buildInfoPlugin } from './scripts/buildInfoPlugin.ts';
import { pwaPlugin } from './scripts/pwaPlugin.ts';
import { buildScheme } from './src/styles/buildScheme.ts';
import { bootstrapTheme } from './src/app/themeBootstrap.ts';

export default defineConfig(({ command, mode }) => {
  const internalLab = command === 'serve' || mode === 'gallery';
  return {
    base: process.env.VITE_BASE_PATH ?? '/m8e-calc/',
    preview: { port: mode === 'gallery' ? 4174 : 4173 },
    define: { __INTERNAL_DESIGN_LAB__: JSON.stringify(internalLab) },
    build: {
      manifest: true,
      outDir: mode === 'gallery' ? 'dist-gallery' : 'dist',
    },
    plugins: [
      react(),
      internalLabPlugin(internalLab),
      localePlugin(),
      pwaPlugin(),
      buildInfoPlugin(internalLab),
      cspPlugin(),
      {
        name: 'inline-theme-bootstrap',
        transformIndexHtml: {
          order: 'pre',
          handler: (html) =>
            html.replace(
              '<!-- theme-bootstrap -->',
              `<script>(${bootstrapTheme.toString()})(${JSON.stringify({
                light: buildScheme('#6750a4'),
                dark: buildScheme('#6750a4', 'tonalSpot', true),
              })});</script>`,
            ),
        },
      },
    ],
    test: {
      pool: 'threads',
      maxWorkers: 2,
      // Keep independent Vite servers; app-build plugins do not belong to tests.
      sharedViteServer: false,
      projects: [
        {
          // Vitest 5 otherwise inherits the app's Vite plugins by default.
          extends: false,
          define: { __INTERNAL_DESIGN_LAB__: 'true' },
          test: {
            name: 'ui',
            // Preserve Vitest 4's explicit, per-suite mock cleanup lifecycle.
            clearMocks: false,
            restoreMocks: false,
            environment: 'jsdom',
            setupFiles: ['./src/test/setup.ts'],
            include: ['src/**/*.test.{ts,tsx}'],
            exclude: [
              'src/engine/**/*.test.ts',
              'src/units/**/*.test.ts',
              'src/graph/**/*.test.ts',
            ],
          },
        },
        {
          // Vitest 5 otherwise inherits the app's Vite plugins by default.
          extends: false,
          define: { __INTERNAL_DESIGN_LAB__: 'true' },
          test: {
            name: 'engine',
            // Preserve Vitest 4's explicit, per-suite mock cleanup lifecycle.
            clearMocks: false,
            restoreMocks: false,
            environment: 'node',
            include: [
              'src/engine/**/*.test.ts',
              'src/units/**/*.test.ts',
              'src/graph/**/*.test.ts',
            ],
          },
        },
      ],
    },
  };
});
