import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getReadableTextColor, normalizeCardColor, normalizeCardTextColor } from '@/lib/card-color';

const CARD_COLOR_PALETTE_STORAGE_KEY = 'notenest-card-color-palette';

interface HsvColor {
  h: number;
  s: number;
  v: number;
}

interface PaletteSlot {
  backgroundColor: string | null;
  textColor: '#111827' | '#ffffff' | null;
  textColorHsv: HsvColor | null;
}

const DEFAULT_SLOT: PaletteSlot = { backgroundColor: null, textColor: null, textColorHsv: null };
const FALLBACK_PALETTE: PaletteSlot[] = [
  DEFAULT_SLOT,
  { backgroundColor: '#fef3c7', textColor: '#111827', textColorHsv: { h: 0, s: 0, v: 0.07 } },
  { backgroundColor: '#dcfce7', textColor: '#111827', textColorHsv: { h: 0, s: 0, v: 0.07 } },
  { backgroundColor: '#dbeafe', textColor: '#111827', textColorHsv: { h: 0, s: 0, v: 0.07 } },
  { backgroundColor: '#fce7f3', textColor: '#111827', textColorHsv: { h: 0, s: 0, v: 0.07 } },
  { backgroundColor: '#ede9fe', textColor: '#111827', textColorHsv: { h: 0, s: 0, v: 0.07 } },
  { backgroundColor: '#ffedd5', textColor: '#111827', textColorHsv: { h: 0, s: 0, v: 0.07 } },
  { backgroundColor: '#e0f2fe', textColor: '#111827', textColorHsv: { h: 0, s: 0, v: 0.07 } },
];

interface CardColorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  color: string | null | undefined;
  textColor?: string | null;
  textColorHsv?: HsvColor | null;
  onApply: (selection: { backgroundColor: string | null; textColor: '#111827' | '#ffffff' | null; textColorHsv: HsvColor | null }) => void;
}

function normalizePaletteSlot(value: unknown, fallback: PaletteSlot, index: number): PaletteSlot {
  if (index === 0) return DEFAULT_SLOT;
  if (typeof value === 'string') {
    const backgroundColor = normalizeCardColor(value) ?? fallback.backgroundColor;
    const textColor = normalizeCardTextColor(getReadableTextColor(backgroundColor)) ?? fallback.textColor;
    return { backgroundColor, textColor, textColorHsv: textColor ? hexToHsv(textColor) : null };
  }
  if (value && typeof value === 'object') {
    const slot = value as Partial<PaletteSlot>;
    const backgroundColor = normalizeCardColor(slot.backgroundColor) ?? fallback.backgroundColor;
    const textColor = normalizeCardTextColor(slot.textColor) ?? normalizeCardTextColor(getReadableTextColor(backgroundColor)) ?? fallback.textColor;
    return { backgroundColor, textColor, textColorHsv: slot.textColorHsv ?? (textColor ? hexToHsv(textColor) : null) };
  }
  return fallback;
}

function readPalette(): PaletteSlot[] {
  if (typeof window === 'undefined') return FALLBACK_PALETTE;
  try {
    const raw = window.localStorage.getItem(CARD_COLOR_PALETTE_STORAGE_KEY);
    if (!raw) return FALLBACK_PALETTE;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return FALLBACK_PALETTE;
    return FALLBACK_PALETTE.map((fallback, index) => normalizePaletteSlot(parsed[index], fallback, index));
  } catch {
    return FALLBACK_PALETTE;
  }
}

function writePalette(palette: PaletteSlot[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CARD_COLOR_PALETTE_STORAGE_KEY, JSON.stringify(palette));
}

function hexToHsv(hex: string): HsvColor {
  const red = parseInt(hex.slice(1, 3), 16) / 255;
  const green = parseInt(hex.slice(3, 5), 16) / 255;
  const blue = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6);
    else if (max === green) h = 60 * ((blue - red) / delta + 2);
    else h = 60 * ((red - green) / delta + 4);
  }

  return {
    h: h < 0 ? h + 360 : h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function hsvToHex({ h, s, v }: HsvColor): string {
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = v - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (h < 60) [red, green, blue] = [chroma, x, 0];
  else if (h < 120) [red, green, blue] = [x, chroma, 0];
  else if (h < 180) [red, green, blue] = [0, chroma, x];
  else if (h < 240) [red, green, blue] = [0, x, chroma];
  else if (h < 300) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];

  const toHex = (value: number) => Math.round((value + match) * 255).toString(16).padStart(2, '0');
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

export function CardColorDialog({ open, onOpenChange, color, textColor, textColorHsv, onApply }: CardColorDialogProps) {
  const shadeRef = useRef<HTMLDivElement | null>(null);
  const [palette, setPalette] = useState<PaletteSlot[]>(() => readPalette());
  const initialColor = useMemo(() => normalizeCardColor(color), [color]);
  const initialTextColor = useMemo(() => normalizeCardTextColor(textColor), [textColor]);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [draftColor, setDraftColor] = useState('#fef3c7');
  const [draftTextColor, setDraftTextColor] = useState<'#111827' | '#ffffff'>('#111827');
  const [draftTextHsv, setDraftTextHsv] = useState<HsvColor>(() => hexToHsv('#111827'));
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv('#fef3c7'));
  const isDefaultSlot = selectedSlot === 0;

  useEffect(() => {
    if (!open) return;
    const nextPalette = readPalette();
    setPalette(nextPalette);
    const matchingIndex = nextPalette.findIndex((slot) => slot.backgroundColor === initialColor);
    const nextSelectedSlot = matchingIndex >= 0 ? matchingIndex : 0;
    const nextSlot = nextPalette[nextSelectedSlot];
    const nextDraftColor = initialColor ?? nextSlot.backgroundColor ?? '#fef3c7';
    const nextTextColor = initialTextColor ?? nextSlot.textColor ?? normalizeCardTextColor(getReadableTextColor(nextDraftColor)) ?? '#111827';
    setSelectedSlot(nextSelectedSlot);
    setDraftColor(nextDraftColor);
    setDraftTextColor(nextTextColor);
    setDraftTextHsv(textColorHsv ?? nextSlot.textColorHsv ?? hexToHsv(nextTextColor));
    setHsv(hexToHsv(nextDraftColor));
  }, [open, initialColor, initialTextColor, textColorHsv]);

  const handleSlotClick = (index: number) => {
    const slot = palette[index];
    const nextDraftColor = slot.backgroundColor ?? '#fef3c7';
    const nextTextColor = slot.textColor ?? normalizeCardTextColor(getReadableTextColor(nextDraftColor)) ?? '#111827';
    setSelectedSlot(index);
    setDraftColor(nextDraftColor);
    setDraftTextColor(nextTextColor);
    setDraftTextHsv(slot.textColorHsv ?? hexToHsv(nextTextColor));
    setHsv(hexToHsv(nextDraftColor));
  };

  const updateHsv = (nextHsv: HsvColor) => {
    setHsv(nextHsv);
    setDraftColor(hsvToHex(nextHsv));
  };

  const updateShadeFromPointer = (clientX: number, clientY: number) => {
    const node = shadeRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    updateHsv({ ...hsv, s, v });
  };

  const handleSaveSlot = () => {
    if (isDefaultSlot) return;
    const nextColor = normalizeCardColor(draftColor) ?? '#fef3c7';
    const nextPalette = palette.map((slot, index) => (index === selectedSlot ? {
      backgroundColor: nextColor,
      textColor: draftTextColor,
      textColorHsv: draftTextHsv,
    } : slot));
    setDraftColor(nextColor);
    setHsv(hexToHsv(nextColor));
    setPalette(nextPalette);
    writePalette(nextPalette);
  };

  const handleApply = () => {
    const nextColor = normalizeCardColor(draftColor) ?? '#fef3c7';
    onApply(isDefaultSlot
      ? { backgroundColor: null, textColor: null, textColorHsv: null }
      : { backgroundColor: nextColor, textColor: draftTextColor, textColorHsv: draftTextHsv });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Card Color</DialogTitle>
          <DialogDescription>Choose a saved color or edit one of the palette slots.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-8 gap-1.5">
          {palette.map((slot, index) => (
            <button
              key={index}
              type="button"
              aria-label={index === 0 ? 'Default color' : `Color slot ${index + 1}`}
              className={cn(
                'h-8 rounded-md border border-border shadow-sm transition',
                selectedSlot === index && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              )}
              style={{
                backgroundColor: slot.backgroundColor ?? 'hsl(var(--card))',
                color: slot.textColor ?? 'hsl(var(--card-foreground))',
              }}
              onClick={() => handleSlotClick(index)}
            >
              <span className="text-[10px] font-semibold">Text</span>
            </button>
          ))}
        </div>

        <div className={cn('space-y-3 rounded-md border p-3', isDefaultSlot && 'bg-muted/30')}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">{isDefaultSlot ? 'Default background' : `Edit slot ${selectedSlot + 1}`}</div>
            <div
              className="flex h-10 w-20 items-center justify-center rounded-md border text-sm font-semibold"
              style={{
                backgroundColor: isDefaultSlot ? 'hsl(var(--card))' : draftColor,
                color: isDefaultSlot ? 'hsl(var(--card-foreground))' : draftTextColor,
              }}
            >
              Text
            </div>
          </div>

          {!isDefaultSlot && (
            <div className="space-y-3">
              <div
                ref={shadeRef}
                className="relative h-44 cursor-crosshair overflow-hidden rounded-md border border-border"
                style={{
                  backgroundColor: `hsl(${hsv.h} 100% 50%)`,
                  backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
                }}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  updateShadeFromPointer(event.clientX, event.clientY);
                }}
                onPointerMove={(event) => {
                  if (event.buttons !== 1) return;
                  updateShadeFromPointer(event.clientX, event.clientY);
                }}
              >
                <div
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
                  style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={Math.round(hsv.h)}
                aria-label="Hue"
                onChange={(event) => updateHsv({ ...hsv, h: Number(event.target.value) })}
                className="h-4 w-full cursor-pointer appearance-none rounded-full border border-border bg-[linear-gradient(to_right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)]"
              />
              <input
                value={draftColor}
                onChange={(event) => {
                  const nextColor = normalizeCardColor(event.target.value);
                  setDraftColor(event.target.value);
                  if (nextColor) setHsv(hexToHsv(nextColor));
                }}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm uppercase"
              />
              <div className="space-y-2">
                <div className="text-sm font-medium">Text color</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Black', color: '#111827' as const },
                    { label: 'White', color: '#ffffff' as const },
                  ].map((option) => (
                    <button
                      key={option.color}
                      type="button"
                      className={cn(
                        'rounded-md border px-3 py-2 text-sm font-medium',
                        draftTextColor === option.color && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                      )}
                      style={{ backgroundColor: option.color, color: option.color === '#ffffff' ? '#111827' : '#ffffff' }}
                      onClick={() => {
                        setDraftTextColor(option.color);
                        setDraftTextHsv(hexToHsv(option.color));
                      }}
                    >
                      Text
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isDefaultSlot && (
            <p className="text-xs text-muted-foreground">The default slot clears the custom background color.</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="secondary" onClick={handleSaveSlot} disabled={isDefaultSlot}>Save</Button>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
