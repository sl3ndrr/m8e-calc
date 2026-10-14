import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { pwaPlugin } from './scripts/pwaPlugin';
import { buildScheme } from './src/styles/buildScheme.ts';
import { bootstrapTheme } from './src/app/themeBootstrap.ts';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/m8e-calc/',
  plugins: [
    react(),
    pwaPlugin(),
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
    projects: [
      {
        test: {
          name: 'ui',
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
        test: {
          name: 'engine',
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
});

