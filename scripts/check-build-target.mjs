import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const [directory = 'dist', target = 'normal'] = process.argv.slice(2);
assert.equal(JSON.parse(readFileSync(join(directory, 'build-target.json'))).target, target);
const manifest = JSON.parse(readFileSync(join(directory, '.vite/manifest.json')));
const files = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : [path];
});
const text = files(directory).filter((path) => /\.(js|css)$/.test(path))
  .map((path) => readFileSync(path, 'utf8')).join('\n');
const precache = readFileSync(join(directory, 'sw.js'), 'utf8');
const hasLab = Object.keys(manifest).some((key) => key.endsWith('/DesignLab.tsx'));
assert.equal(hasLab, target === 'gallery');
if (target === 'normal') {
  assert.doesNotMatch(text, /\.design-lab|\.component-gallery|Raum für deinen Stil|Room for your style/);
  assert.doesNotMatch(precache, /DesignLab|ComponentGallery|MotionDemo/);
}
for (const mode of ['SimpleMode', 'ScientificMode', 'ConvertMode', 'GraphMode']) {
  const chunk = Object.entries(manifest).find(([key]) => key.endsWith(`/${mode}.tsx`));
  assert.ok(chunk, `Missing ${mode}`);
  assert.ok(precache.includes(chunk[1].file), `Missing offline ${mode}`);
}
console.log(`${directory}: verified ${target} target, manifest, assets and precache`);
