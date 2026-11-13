/**
 * Spreads a rough total evenly over colours and sizes, so a visitor can type one number instead of filling a grid.
 * Pure and dependency free (it is unit tested on its own). Leftover pieces go to the first colours and sizes.
 */
export function splitEvenly<S extends string>(
  total: number,
  colourIds: readonly string[],
  sizes: readonly S[],
): Record<string, Partial<Record<S, string>>> {
  const out: Record<string, Partial<Record<S, string>>> = {};
  const whole = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  if (!colourIds.length || !sizes.length) return out;

  const spread = (n: number, parts: number): number[] =>
    Array.from({ length: parts }, (_, i) => Math.floor(n / parts) + (i < n % parts ? 1 : 0));

  const perColour = spread(whole, colourIds.length);
  colourIds.forEach((id, ci) => {
    const row: Partial<Record<S, string>> = {};
    spread(perColour[ci] ?? 0, sizes.length).forEach((n, si) => {
      const size = sizes[si];
      if (size !== undefined) row[size] = n > 0 ? String(n) : "";
    });
    out[id] = row;
  });
  return out;
}
