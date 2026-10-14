import { useEffect, useRef } from 'react';
let insertion: ((text: string) => void) | null = null;
export function insertScientific(text: string): boolean {
  if (!insertion) return false;
  insertion(text);
  return true;
}
export function useScientificInsertion(callback: (text: string) => void): void {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });
  useEffect(() => {
    const handler = (text: string) => latest.current(text);
    insertion = handler;
    return () => {
      if (insertion === handler) insertion = null;
    };
  }, []);
}
