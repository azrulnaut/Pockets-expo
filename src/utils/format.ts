export function fmt(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseDollars(str: string): number | null {
  const v = parseFloat(str);
  if (isNaN(v) || v < 0) return null;
  return Math.round(v * 100);
}
