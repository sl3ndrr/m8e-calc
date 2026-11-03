import type { Environment } from '../../engine';

// UTF-16 code units in the complete persisted envelope, independently of file bytes.
export const MAX_SCIENTIFIC_STORAGE_LENGTH = 16 * 1024 * 1024;

export function scientificStorageEnvelope(environment: Environment): string {
  const raw = JSON.stringify({ state: { environment }, version: 1 });
  if (raw.length > MAX_SCIENTIFIC_STORAGE_LENGTH)
    throw new RangeError('Scientific storage envelope too large');
  return raw;
}
