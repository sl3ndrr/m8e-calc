import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { checkDocuments } from '../check-release-docs.mjs';

test('documentation check covers nested Markdown and skips external URLs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'release-docs-'));
  try {
    await mkdir(join(root, 'docs'));
    await mkdir(join(root, 'src/feature'), { recursive: true });
    await mkdir(join(root, '.github'));
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ scripts: { check: 'node check.mjs' } }),
    );
    for (const file of ['README.md', 'AGENTS.md', 'CHANGELOG.md'])
      await writeFile(join(root, file), '[Contract](docs/contract.md#section)');
    await writeFile(join(root, 'docs/contract.md'), '# Section');
    await writeFile(
      join(root, 'src/feature/README.md'),
      '[Removed](../../docs/removed.md) [External](https://example.invalid)',
    );
    await writeFile(
      join(root, '.github/pull_request_template.md'),
      'npm run check\nnpm run removed',
    );

    assert.deepEqual(await checkDocuments(root), {
      documents: 6,
      links: 4,
      commands: 2,
      failures: [
        '.github/pull_request_template.md: unknown npm script removed',
        'src/feature/README.md: missing or invalid local link ../../docs/removed.md',
      ],
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
