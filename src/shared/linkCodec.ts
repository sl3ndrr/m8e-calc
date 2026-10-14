/** Bounded LZW over UTF-8 bytes; 16-bit big-endian codes, base64url transport. */
const LIMIT = 65536;
export function compressLink(text: string): string {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > LIMIT) throw new RangeError('Link payload too large');
  const dictionary = new Map<string, number>();
  for (let i = 0; i < 256; i++) dictionary.set(String.fromCharCode(i), i);
  const codes: number[] = [];
  let word = '',
    next = 256;
  for (const byte of bytes) {
    const char = String.fromCharCode(byte),
      combined = word + char;
    if (dictionary.has(combined)) word = combined;
    else {
      codes.push(dictionary.get(word) ?? 0);
      if (next < LIMIT) dictionary.set(combined, next++);
      word = char;
    }
  }
  if (word) codes.push(dictionary.get(word) ?? 0);
  let binary = '';
  for (const code of codes)
    binary += String.fromCharCode(code >> 8, code & 255);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
export function decompressLink(encoded: string): string {
  if (encoded.length > 32768 || !/^[\w-]+$/.test(encoded))
    throw new TypeError('Invalid link');
  const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
  if (!binary.length || binary.length % 2) throw new TypeError('Invalid codes');
  const dictionary = Array.from({ length: 256 }, (_, i) =>
    String.fromCharCode(i),
  );
  let previous = '',
    output = '';
  for (let i = 0; i < binary.length; i += 2) {
    const code = (binary.charCodeAt(i) << 8) | binary.charCodeAt(i + 1);
    const word =
      dictionary[code] ??
      (code === dictionary.length && previous
        ? previous + previous[0]
        : undefined);
    if (word === undefined || output.length + word.length > LIMIT)
      throw new TypeError('Invalid or oversized link');
    output += word;
    if (previous && dictionary.length < LIMIT)
      dictionary.push(previous + word[0]);
    previous = word;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(
    Uint8Array.from(output, (c) => c.charCodeAt(0)),
  );
}
