import type { ModeId } from '../shared/modes';
const chunks: Record<ModeId, string> = {
  simple: 'SimpleMode-',
  scientific: 'ScientificMode-',
  convert: 'ConvertMode-',
  graph: 'GraphMode-',
};
/** WebKit may keep a failed module response across reloads. Refresh its HTTP cache first. */
export async function refreshModeChunk(
  mode: ModeId,
  resources: readonly { name: string }[],
  origin: string,
  request: typeof fetch = fetch,
): Promise<void> {
  const urls = resources
    .map((resource) => new URL(resource.name, origin))
    .filter(
      (url) =>
        url.origin === origin &&
        url.pathname.split('/').at(-1)?.startsWith(chunks[mode]) &&
        url.pathname.endsWith('.js'),
    );
  await Promise.all(
    urls.map((url) =>
      request(url.href, { cache: 'reload' }).catch(() => undefined),
    ),
  );
}
