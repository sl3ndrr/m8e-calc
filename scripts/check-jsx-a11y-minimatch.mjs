import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';

// Reuse the V4 Custom* control glob: the first label exercises both utilities.
const source = [
  '<>',
  '  <label><CustomInput /></label>',
  '  <label>Label<CustomInput /></label>',
  '  <label>Label</label>',
  '</>;',
].join('\n');

try {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.jsx'],
        languageOptions: {
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { 'jsx-a11y': jsxA11y },
        rules: {
          'jsx-a11y/label-has-associated-control': [
            'error',
            { controlComponents: ['Custom*'], assert: 'nesting' },
          ],
        },
      },
    ],
  });
  const results = await eslint.lintText(source, {
    filePath: 'jsx-a11y-minimatch-guard.jsx',
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].fatalErrorCount, 0);
  assert.deepEqual(
    results[0].messages.map(({ ruleId, severity, message, line, column }) => ({
      ruleId,
      severity,
      message,
      line,
      column,
    })),
    [
      {
        ruleId: 'jsx-a11y/label-has-associated-control',
        severity: 2,
        message: 'A form label must have accessible text.',
        line: 2,
        column: 3,
      },
      {
        ruleId: 'jsx-a11y/label-has-associated-control',
        severity: 2,
        message: 'A form label must be associated with a control.',
        line: 4,
        column: 3,
      },
    ],
  );
  console.log(
    '[jsx-a11y minimatch guard] PASS: both glob paths; exactly 2 expected messages.',
  );
} catch (error) {
  console.error(`[jsx-a11y minimatch guard] FAIL: ${error.message}`);
  process.exitCode = 1;
}
