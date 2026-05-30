export function normalizeCardColor(color: string | null | undefined): string | null {
  if (!color) return null;
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : null;
}

export function getReadableTextColor(backgroundColor: string | null | undefined): string | undefined {
  const normalized = normalizeCardColor(backgroundColor);
  if (!normalized) return undefined;
  const red = parseInt(normalized.slice(1, 3), 16) / 255;
  const green = parseInt(normalized.slice(3, 5), 16) / 255;
  const blue = parseInt(normalized.slice(5, 7), 16) / 255;
  const toLinear = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  const luminance = 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);
  return luminance > 0.45 ? '#111827' : '#ffffff';
}

export function normalizeCardTextColor(color: string | null | undefined): '#111827' | '#ffffff' | null {
  if (color === '#111827' || color === '#ffffff') return color;
  if (color?.toLowerCase() === '#000000') return '#111827';
  if (color?.toLowerCase() === '#fff') return '#ffffff';
  return null;
}
