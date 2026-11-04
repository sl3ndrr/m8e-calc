import { afterEach, expect, it, vi } from 'vitest';
import { createEnvironment } from '../../engine';
import {
  DEFINITION_BACKUP_FORMAT,
  MAX_DEFINITION_FILE_BYTES,
} from './definitionBackup';
import {
  DEFINITION_DOWNLOAD_NAME,
  downloadDefinitions,
  readDefinitionFile,
} from './definitionFiles';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it('downloads a fixed safe local name and always revokes its object URL, including on failure', () => {
  vi.useFakeTimers();
  const createObjectURL = vi.fn((blob: Blob | MediaSource) => {
    expect(blob).toBeInstanceOf(Blob);
    return 'blob:local';
  });
  const revokeObjectURL = vi.fn();
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    },
  );
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe(DEFINITION_DOWNLOAD_NAME);
      expect(this.href).toBe('blob:local');
    });
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  downloadDefinitions(createEnvironment());
  expect(createObjectURL).toHaveBeenCalledOnce();
  expect(createObjectURL.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
  vi.runAllTimers();
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:local');
  click.mockImplementation(() => {
    throw new Error('download');
  });
  expect(() => downloadDefinitions(createEnvironment())).toThrow('download');
  vi.runAllTimers();
  expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  expect(fetch).not.toHaveBeenCalled();
});
it('rejects oversized files before reading and propagates read failures without a partial result', async () => {
  const text = vi.fn(async () => '{}');
  const file = Object.assign(new File([], 'foreign.html'), { text });
  Object.defineProperty(file, 'size', {
    value: MAX_DEFINITION_FILE_BYTES + 1,
  });
  await expect(readDefinitionFile(file)).rejects.toThrow('tooLarge');
  expect(text).not.toHaveBeenCalled();
  const denied = Object.assign(new File([], 'backup.json'), {
    text: () => Promise.reject(new Error('denied')),
  });
  await expect(readDefinitionFile(denied)).rejects.toThrow('denied');
});
it('reads content without trusting file names or MIME types and validates the decoded bytes too', async () => {
  const data = {
    format: DEFINITION_BACKUP_FORMAT,
    version: 1,
    variables: {},
    functions: {},
  };
  const file = Object.assign(
    new File([], '../../unsafe.html', { type: 'text/html' }),
    { text: async () => JSON.stringify(data) },
  );
  await expect(readDefinitionFile(file)).resolves.toEqual(data);
  Object.assign(file, {
    text: async () => ' '.repeat(MAX_DEFINITION_FILE_BYTES + 1),
  });
  await expect(readDefinitionFile(file)).rejects.toThrow('tooLarge');
});
