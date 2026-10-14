export interface SearchItem {
  id: string;
  label: string;
  keywords?: string;
}
function normalize(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}
/** Subsequence matching with contiguous and word-start bonuses. Stable ties. */
export function fuzzyScore(query: string, text: string): number | null {
  const q = normalize(query).trim(),
    haystack = normalize(text);
  if (!q) return 0;
  const direct = haystack.indexOf(q);
  if (direct >= 0) return 1000 - direct - (haystack.length - q.length) * 0.01;
  let position = 0,
    score = 0,
    previous = -2;
  for (const char of q) {
    if (char === ' ') continue;
    const at = haystack.indexOf(char, position);
    if (at < 0) return null;
    score +=
      10 +
      (at === previous + 1 ? 8 : 0) +
      (at === 0 || /[\s._-]/.test(haystack[at - 1] ?? '') ? 5 : 0) -
      (at - position) * 0.2;
    position = at + 1;
    previous = at;
  }
  return score;
}
export function fuzzySearch<T extends SearchItem>(
  items: readonly T[],
  query: string,
): T[] {
  return items
    .map((item, index) => ({
      item,
      index,
      score: fuzzyScore(query, `${item.label} ${item.keywords ?? ''}`),
    }))
    .filter((r): r is typeof r & { score: number } => r.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.item);
}
