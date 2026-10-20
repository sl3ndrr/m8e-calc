import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function walk(root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (
      ['frames.json', 'slow-worker-frames.json'].includes(entry.name)
    ) {
      const report = JSON.parse(await readFile(path, 'utf8'));
      const frames = report.frames;
      const signatures = new Map();
      const snapshots = [];
      let last = '';
      for (const frame of frames) {
        const key = JSON.stringify([
          frame.paths,
          frame.revealing,
          frame.segments === 0,
        ]);
        if (key === last) continue;
        last = key;
        const rendered = frame.rendered.map((p) => {
          if (!signatures.has(p.signature))
            signatures.set(p.signature, signatures.size);
          return {
            signature: signatures.get(p.signature),
            born: p.born,
            length: p.length,
          };
        });
        snapshots.push({ ...frame, rendered });
      }
      console.log(
        'AP43_EVIDENCE ' +
          JSON.stringify({
            path,
            ...report,
            frames: undefined,
            frameCount: frames.length,
            blankFrames: frames.filter((f) => !f.segments).length,
            revealFrames: frames.filter((f) => f.revealing).length,
            firstFrame: frames[0]?.at,
            lastFrame: frames.at(-1)?.at,
            signatures: [...signatures.keys()],
            snapshots,
          }),
      );
    }
  }
}
await walk(process.argv[2] ?? 'test-results/ap43');
for (const path of [
  'test-results/graph-performance.json',
  'test-results/graph-implicit-ui-performance.json',
]) {
  try {
    console.log('AP43_PERFORMANCE ' + (await readFile(path, 'utf8')).replace(/\n/g, ''));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
