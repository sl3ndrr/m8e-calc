export function Symbol({ name }: { name: string }) {
  return (
    <span className="symbol" aria-hidden="true">
      {name}
    </span>
  );
}
