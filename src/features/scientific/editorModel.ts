export interface EditorSnapshot {
  text: string;
  anchor: number;
  head: number;
}
export interface Insertion {
  text: string;
  /** Optional suffix wraps a selection; without selection the caret stays before it. */
  suffix?: string;
}
export function insertAtSelection(
  state: EditorSnapshot,
  insertion: Insertion,
): EditorSnapshot {
  const from = Math.max(
    0,
    Math.min(state.text.length, state.anchor, state.head),
  );
  const to = Math.max(
    from,
    Math.min(state.text.length, Math.max(state.anchor, state.head)),
  );
  const selected = state.text.slice(from, to);
  const wrapped = insertion.suffix !== undefined;
  const replacement =
    insertion.text + (wrapped ? selected + insertion.suffix : '');
  const caret =
    from +
    insertion.text.length +
    (wrapped && selected
      ? selected.length + (insertion.suffix?.length ?? 0)
      : 0);
  return {
    text: state.text.slice(0, from) + replacement + state.text.slice(to),
    anchor: caret,
    head: caret,
  };
}
export interface HistoryCursor {
  index: number;
  draft: string;
}
export function browseHistory(
  cursor: HistoryCursor,
  direction: -1 | 1,
  current: string,
  entries: readonly string[],
): { cursor: HistoryCursor; text: string } {
  const draft = cursor.index === -1 ? current : cursor.draft;
  const index = Math.max(
    -1,
    Math.min(entries.length - 1, cursor.index - direction),
  );
  return {
    cursor: { index, draft },
    text: index < 0 ? draft : (entries[index] ?? draft),
  };
}
export function singleLine(text: string): string {
  return text.replace(/[\r\n]+/g, ' ');
}
