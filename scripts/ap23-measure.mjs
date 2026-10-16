import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
const [directory = 'dist', output = 'test-results/ap23/size-normal.json'] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync(join(directory, '.vite/manifest.json')));
const initial = new Set();
function visit(key) {
  if (initial.has(key)) return;
  initial.add(key);
  for (const dependency of manifest[key].imports ?? []) visit(dependency);
}
visit(Object.keys(manifest).find((key) => manifest[key].isEntry));
visit(Object.keys(manifest).find((key) => key.endsWith('/SimpleMode.tsx')));
function size(paths) {
  return paths.reduce((sum, path) => {
    const bytes = readFileSync(path);
    return { raw: sum.raw + bytes.length, gzip: sum.gzip + gzipSync(bytes, { level: 9 }).length };
  }, { raw: 0, gzip: 0 });
}
function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}
const result = {
  directory,
  initialJavaScript: size([...initial].map((key) => join(directory, manifest[key].file))),
  artifact: size(files(directory)),
  initialChunks: [...initial].map((key) => manifest[key].file),
  files: files(directory).map((file) => ({ file: file.slice(directory.length + 1), ...size([file]) })),
};
mkdirSync('test-results/ap23', { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ directory, initialJavaScript: result.initialJavaScript, artifact: result.artifact }));
