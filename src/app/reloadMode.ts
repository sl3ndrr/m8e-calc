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
  const names = [
    chunks[mode],
    'extended-',
    ...(mode === 'scientific' ? ['ExpressionEditor-', 'MathDisplay-'] : []),
    ...(mode === 'graph' ? ['ExpressionEditor-'] : []),
  ];
  await refreshChunks(names, resources, origin, request);
}
export async function refreshAppChunks(
  resources: readonly { name: string }[],
  origin: string,
  request: typeof fetch = fetch,
): Promise<void> {
  await refreshChunks(
    [
      ...Object.values(chunks),
      'ExpressionEditor-',
      'MathDisplay-',
      'SettingsDialog-',
      'ShortcutDialog-',
      'HistorySheet-',
      'CommandPalette-',
      'AccentPanel-',
      'DesignLab-',
      'extended-',
    ],
    resources,
    origin,
    request,
  );
}
async function refreshChunks(
  names: readonly string[],
  resources: readonly { name: string }[],
  origin: string,
  request: typeof fetch,
): Promise<void> {
  const urls = resources
    .map((resource) => new URL(resource.name, origin))
    .filter(
      (url) =>
        url.origin === origin &&
        names.some((name) =>
          url.pathname.split('/').at(-1)?.startsWith(name),
        ) &&
        url.pathname.endsWith('.js'),
    );
  await Promise.all(
    urls.map((url) =>
      request(url.href, { cache: 'reload' }).catch(() => undefined),
    ),
  );
}
