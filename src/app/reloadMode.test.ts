import { it, expect, vi } from 'vitest';
import { refreshAppChunks, refreshModeChunk } from './reloadMode';
it('refreshes only the failed mode chunk on the current origin before reload', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response('module'));
  await refreshModeChunk(
    'scientific',
    [
      { name: 'https://calc.example/assets/ScientificMode-a.js' },
      { name: 'https://calc.example/assets/ExpressionEditor-a.js' },
      { name: 'https://calc.example/assets/MathDisplay-a.js' },
      { name: 'https://calc.example/assets/GraphMode-a.js' },
      { name: 'https://calc.example/assets/ScientificMode-a.css' },
      { name: 'https://other.example/assets/ScientificMode-a.js' },
    ],
    'https://calc.example',
    request,
  );
  expect(request).toHaveBeenCalledTimes(3);
  expect(request).toHaveBeenCalledWith(
    'https://calc.example/assets/ScientificMode-a.js',
    { cache: 'reload' },
  );
});
it('still permits reload when the chunk cannot be refreshed', async () => {
  const request = vi.fn<typeof fetch>().mockRejectedValue(Error('offline'));
  await expect(
    refreshModeChunk(
      'graph',
      [{ name: 'https://calc.example/assets/GraphMode-a.js' }],
      'https://calc.example',
      request,
    ),
  ).resolves.toBeUndefined();
});
it('refreshes shared application chunks without requesting foreign origins', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response('module'));
  await refreshAppChunks(
    [
      { name: 'https://calc.example/assets/SettingsDialog-a.js' },
      { name: 'https://calc.example/assets/ExpressionEditor-a.js' },
      { name: 'https://other.example/assets/SettingsDialog-a.js' },
      { name: 'https://calc.example/assets/unrelated-a.js' },
    ],
    'https://calc.example',
    request,
  );
  expect(request).toHaveBeenCalledTimes(2);
  expect(request).toHaveBeenCalledWith(
    'https://calc.example/assets/SettingsDialog-a.js',
    { cache: 'reload' },
  );
});
