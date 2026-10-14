import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
const require = createRequire(
  process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'package.json')
    : import.meta.url,
);
const sharp = require('sharp');
const source = await readFile(
  new URL('../public/icons/app.svg', import.meta.url),
  'utf8',
);
for (const size of [192, 512]) {
  await sharp(Buffer.from(source))
    .resize(size, size)
    .png()
    .toFile(
      new URL(`../public/icons/app-${size}.png`, import.meta.url).pathname,
    );
}
// Opaque full-bleed background, artwork inside the central 80% safe circle.
const maskable = source.replace('rx="112"', 'rx="0"');
await sharp(Buffer.from(maskable))
  .resize(512, 512)
  .png()
  .toFile(
    new URL('../public/icons/app-maskable-512.png', import.meta.url).pathname,
  );
