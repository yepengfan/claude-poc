export function sumUpTo(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error("must be a non-negative integer");
  }
  return (n * (n + 1)) / 2;
}
