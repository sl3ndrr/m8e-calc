import { access, glob, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function checkDocuments(root = '.') {
  const manifest = JSON.parse(
    await readFile(resolve(root, 'package.json'), 'utf8'),
  );
  const documents = ['README.md', 'CHANGELOG.md', 'AGENTS.md'];
  for await (const file of glob('{docs,src,.github}/**/*.md', { cwd: root }))
    documents.push(file);

  const failures = [];
  let links = 0;
  let commands = 0;
  for (const file of documents.sort()) {
    const text = await readFile(resolve(root, file), 'utf8');
    for (const [, command] of text.matchAll(/npm run ([\w:-]+)/g)) {
      commands++;
      if (!Object.hasOwn(manifest.scripts, command))
        failures.push(`${file}: unknown npm script ${command}`);
    }
    for (const [, link] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(link)) continue;
      links++;
      try {
        const path = decodeURIComponent(link.split('#')[0]);
        await access(resolve(root, dirname(file), path));
      } catch {
        failures.push(`${file}: missing or invalid local link ${link}`);
      }
    }
  }
  return { documents: documents.length, links, commands, failures };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { documents, links, commands, failures } = await checkDocuments();
  for (const failure of failures) console.error(failure);
  console.log(
    `Checked ${documents} documents, ${links} local links and ${commands} npm commands.`,
  );
  process.exitCode = failures.length ? 1 : 0;
}
