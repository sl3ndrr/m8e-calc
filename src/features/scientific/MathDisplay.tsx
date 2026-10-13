import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
export default function MathDisplay({
  latex,
  label,
}: {
  latex: string;
  label: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (host.current)
      katex.render(latex, host.current, {
        throwOnError: false,
        trust: false,
        strict: 'ignore',
        output: 'htmlAndMathml',
        displayMode: true,
      });
  }, [latex]);
  return (
    <div
      ref={host}
      className="scientific-math"
      role="group"
      aria-label={label}
    />
  );
}
