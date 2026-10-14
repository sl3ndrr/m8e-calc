import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      '.lighthouseci/**',
      '.qa-baseline/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: globals.node } },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
    },
  },
  {
    files: ['src/{engine,units,graph}/**/*.ts'],
    languageOptions: {
      globals: Object.fromEntries(
        Object.keys(globals.browser).map((name) => [name, 'off']),
      ),
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react/**',
                'react-dom',
                'react-dom/**',
                'zustand',
                'zustand/**',
                '**/app/**',
                '**/ui/**',
                '**/features/**',
                '**/shared/**',
                '**/styles/**',
              ],
              message:
                'Domain layers must be pure TypeScript without React, DOM or application state.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', ...Object.keys(globals.browser)],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression',
          message: 'No dynamic imports in domain layers.',
        },
        {
          selector: 'TSImportType',
          message: 'Use static imports so layer boundaries can be checked.',
        },
        {
          selector: 'CallExpression[callee.name="require"]',
          message: 'Use static imports.',
        },
        {
          selector: 'MemberExpression[object.name="globalThis"]',
          message: 'No browser access through globalThis.',
        },
      ],
    },
  },
  {
    files: ['src/{engine,units,graph}/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message: 'Domain layers only permit .ts files.',
        },
      ],
    },
  },
);
