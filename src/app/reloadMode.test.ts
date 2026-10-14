import { it, expect, vi } from 'vitest';
import { refreshModeChunk } from './reloadMode';
it('refreshes only the failed mode chunk on the current origin before reload', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response('module'));
  await refreshModeChunk(
    'scientific',
    [
      { name: 'https://calc.example/assets/ScientificMode-a.js' },
      { name: 'https://calc.example/assets/GraphMode-a.js' },
      { name: 'https://calc.example/assets/ScientificMode-a.css' },
      { name: 'https://other.example/assets/ScientificMode-a.js' },
    ],
    'https://calc.example',
    request,
  );
  expect(request).toHaveBeenCalledTimes(1);
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
