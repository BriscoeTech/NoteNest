import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Plus, Search, X, Folder, FolderOpen, ChevronDown, Trash2, FolderInput, MoreVertical, MoreHorizontal, Type, List, ChevronUp, Image, GripVertical, FileText, ArrowUp, CheckSquare, Link as LinkIcon, ExternalLink, Pencil, Brush, Eraser, Undo2, Redo2, Move, Minus, Square, Circle } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, CardType, ContentBlock, BulletBlock, ImageBlock, BulletItem, CheckboxBlock, LinkBlock, DrawingBlock, DrawingStroke, DrawingPoint, DrawingGroup, DrawingSnapshot } from '@/lib/types';
import { generateId, getDescendantIds } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { CardOptionsMenu } from './CardOptionsMenu';
import { CategoryPickerDialog } from './CategoryPickerDialog';

interface WorkspacePanelProps {
  currentCard: Card | null;
  childrenCards: Card[];
  allCards: Card[]; // used for search/move picker
  isRecycleBin: boolean;
  onNavigateCard: (id: string | null) => void;
  onAddCard: (parentId: string | null, cardType?: CardType) => string;
  onUpdateCard: (id: string, updates: Partial<Card>) => void;
  onUpdateCardBlocks: (id: string, blocks: ContentBlock[]) => void;
  onMoveCard: (id: string, newParentId: string | null) => void;
  onDeleteCard: (id: string) => void;
  onRestoreCard: (id: string, targetId: string | null) => void;
  onPermanentlyDeleteCard: (id: string) => void;
  onEmptyRecycleBin: () => void;
  onReorderCard: (id: string, direction: 'up' | 'down') => void;
  onReorderCardsByIndex: (ids: string[]) => void; // For children reordering
  onSearch: (query: string) => void;
  searchQuery: string;
  sidebarOpen?: boolean;
}

// ... BlockEditor ... (Reusing existing component, need to define it)
interface BlockEditorProps {
  block: ContentBlock;
  isRecycleBin: boolean;
  isSelected: boolean;
  onUpdate: (block: ContentBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  dragHandleProps?: {
    attributes: Record<string, any>;
    listeners: Record<string, any>;
  };
}

// Keep preview aspect aligned with drawing editor viewport (3:4 width:height).
const DRAWING_PREVIEW_WIDTH = 540;
const DRAWING_PREVIEW_HEIGHT = 720;

const CARD_TYPE_ORDER: CardType[] = ['note', 'checkbox', 'link', 'image', 'drawing', 'folder'];

const CARD_TYPE_LABELS: Record<CardType, string> = {
  note: 'Note',
  checkbox: 'Checkbox',
  link: 'Link',
  image: 'Image',
  drawing: 'Drawing',
  folder: 'Folder',
};

function CardTypeIcon({ cardType, className }: { cardType: CardType; className?: string }) {
  const iconClass = cn('w-5 h-5 text-muted-foreground shrink-0', className);
  if (cardType === 'folder') return <Folder className={iconClass} />;
  if (cardType === 'checkbox') return <CheckSquare className={iconClass} />;
  if (cardType === 'link') return <LinkIcon className={iconClass} />;
  if (cardType === 'image') return <Image className={iconClass} />;
  if (cardType === 'drawing') return <Brush className={iconClass} />;
  return <FileText className={iconClass} />;
}

function renderDrawingStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: DrawingStroke[],
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  for (const stroke of strokes) {
    if (!stroke.points.length) continue;
    const first = stroke.points[0];
    const last = stroke.points[stroke.points.length - 1];
    const kind = stroke.kind ?? 'freehand';

    ctx.save();
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.color || '#111827';
    ctx.fillStyle = stroke.color || '#111827';
    ctx.lineWidth = Math.max(1, stroke.width || 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (kind === 'line') {
      ctx.beginPath();
      ctx.moveTo(first.x * width, first.y * height);
      ctx.lineTo(last.x * width, last.y * height);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (kind === 'rectangle') {
      const left = Math.min(first.x, last.x) * width;
      const top = Math.min(first.y, last.y) * height;
      const w = Math.abs(last.x - first.x) * width;
      const h = Math.abs(last.y - first.y) * height;
      ctx.strokeRect(left, top, w, h);
      ctx.restore();
      continue;
    }

    if (kind === 'circle') {
      const cx = ((first.x + last.x) / 2) * width;
      const cy = ((first.y + last.y) / 2) * height;
      const rx = Math.abs(last.x - first.x) * width / 2;
      const ry = Math.abs(last.y - first.y) * height / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (stroke.points.length === 1) {
      const x = first.x * width;
      const y = first.y * height;
      const radius = Math.max(0.5, ctx.lineWidth / 2);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(first.x * width, first.y * height);
    for (let i = 1; i < stroke.points.length; i += 1) {
      const p = stroke.points[i];
      ctx.lineTo(p.x * width, p.y * height);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function getStrokeSegmentsNormalized(stroke: DrawingStroke): Array<{ ax: number; ay: number; bx: number; by: number }> {
  const kind = stroke.kind ?? 'freehand';
  if (!stroke.points.length) return [];
  const first = stroke.points[0];
  const last = stroke.points[stroke.points.length - 1];

  if (kind === 'line') {
    return [{ ax: first.x, ay: first.y, bx: last.x, by: last.y }];
  }

  if (kind === 'rectangle') {
    const x1 = first.x;
    const y1 = first.y;
    const x2 = last.x;
    const y2 = last.y;
    return [
      { ax: x1, ay: y1, bx: x2, by: y1 },
      { ax: x2, ay: y1, bx: x2, by: y2 },
      { ax: x2, ay: y2, bx: x1, by: y2 },
      { ax: x1, ay: y2, bx: x1, by: y1 },
    ];
  }

  if (kind === 'circle') {
    const cx = (first.x + last.x) / 2;
    const cy = (first.y + last.y) / 2;
    const rx = Math.max(0.0005, Math.abs(last.x - first.x) / 2);
    const ry = Math.max(0.0005, Math.abs(last.y - first.y) / 2);
    const steps = 24;
    const segs: Array<{ ax: number; ay: number; bx: number; by: number }> = [];
    let prevX = cx + rx;
    let prevY = cy;
    for (let i = 1; i <= steps; i += 1) {
      const t = (i / steps) * Math.PI * 2;
      const x = cx + Math.cos(t) * rx;
      const y = cy + Math.sin(t) * ry;
      segs.push({ ax: prevX, ay: prevY, bx: x, by: y });
      prevX = x;
      prevY = y;
    }
    return segs;
  }

  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    return [{ ax: p.x, ay: p.y, bx: p.x, by: p.y }];
  }

  const segs: Array<{ ax: number; ay: number; bx: number; by: number }> = [];
  for (let i = 1; i < stroke.points.length; i += 1) {
    const a = stroke.points[i - 1];
    const b = stroke.points[i];
    segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y });
  }
  return segs;
}

function getStrokeSegments(stroke: DrawingStroke, width: number, height: number): Array<{ ax: number; ay: number; bx: number; by: number }> {
  return getStrokeSegmentsNormalized(stroke).map((s) => ({
    ax: s.ax * width,
    ay: s.ay * height,
    bx: s.bx * width,
    by: s.by * height,
  }));
}

function pointInRectNormalized(p: DrawingPoint, rect: NormalizedRect): boolean {
  return p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom;
}

function orientation(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  const v = (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
  if (Math.abs(v) < 1e-9) return 0;
  return v > 0 ? 1 : 2;
}

function onSegment(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
  return (
    bx <= Math.max(ax, cx) + 1e-9 &&
    bx + 1e-9 >= Math.min(ax, cx) &&
    by <= Math.max(ay, cy) + 1e-9 &&
    by + 1e-9 >= Math.min(ay, cy)
  );
}

function segmentsIntersect(
  a1x: number,
  a1y: number,
  a2x: number,
  a2y: number,
  b1x: number,
  b1y: number,
  b2x: number,
  b2y: number
): boolean {
  const o1 = orientation(a1x, a1y, a2x, a2y, b1x, b1y);
  const o2 = orientation(a1x, a1y, a2x, a2y, b2x, b2y);
  const o3 = orientation(b1x, b1y, b2x, b2y, a1x, a1y);
  const o4 = orientation(b1x, b1y, b2x, b2y, a2x, a2y);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a1x, a1y, b1x, b1y, a2x, a2y)) return true;
  if (o2 === 0 && onSegment(a1x, a1y, b2x, b2y, a2x, a2y)) return true;
  if (o3 === 0 && onSegment(b1x, b1y, a1x, a1y, b2x, b2y)) return true;
  if (o4 === 0 && onSegment(b1x, b1y, a2x, a2y, b2x, b2y)) return true;
  return false;
}

function strokeIntersectsRect(stroke: DrawingStroke, rect: NormalizedRect): boolean {
  const segments = getStrokeSegmentsNormalized(stroke);
  if (!segments.length) return false;

  const edges = [
    { ax: rect.left, ay: rect.top, bx: rect.right, by: rect.top },
    { ax: rect.right, ay: rect.top, bx: rect.right, by: rect.bottom },
    { ax: rect.right, ay: rect.bottom, bx: rect.left, by: rect.bottom },
    { ax: rect.left, ay: rect.bottom, bx: rect.left, by: rect.top },
  ];

  for (const seg of segments) {
    const aInside = pointInRectNormalized({ x: seg.ax, y: seg.ay }, rect);
    const bInside = pointInRectNormalized({ x: seg.bx, y: seg.by }, rect);
    if (aInside || bInside) return true;

    for (const edge of edges) {
      if (segmentsIntersect(seg.ax, seg.ay, seg.bx, seg.by, edge.ax, edge.ay, edge.bx, edge.by)) {
        return true;
      }
    }
  }

  return false;
}

function createDrawingPreviewDataUrl(strokes: DrawingStroke[]): string {
  const canvas = document.createElement('canvas');
  canvas.width = DRAWING_PREVIEW_WIDTH;
  canvas.height = DRAWING_PREVIEW_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  renderDrawingStrokes(ctx, strokes, DRAWING_PREVIEW_WIDTH, DRAWING_PREVIEW_HEIGHT);
  return canvas.toDataURL('image/png');
}

function getVisibleBlocksByCardType(card: Card): ContentBlock[] {
  switch (card.cardType) {
    case 'note':
      return card.blocks.filter(block => block.type === 'text' || block.type === 'bullets');
    case 'checkbox':
      return card.blocks.filter(block => block.type === 'checkbox');
    case 'link':
      return card.blocks.filter(block => block.type === 'link');
    case 'image':
      return card.blocks.filter(block => block.type === 'image');
    case 'drawing':
      return card.blocks.filter(block => block.type === 'drawing');
    case 'folder':
      return [];
    default:
      return [];
  }
}

function distancePointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;
  if (abLenSq === 0) {
    const dx = px - ax;
    const dy = py - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

function strokeContainsPoint(
  stroke: DrawingStroke,
  point: DrawingPoint,
  width: number,
  height: number
): boolean {
  if (!stroke.points.length) return false;
  const px = point.x * width;
  const py = point.y * height;
  const radius = Math.max(6, stroke.width / 2 + 4);

  const segments = getStrokeSegments(stroke, width, height);
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const seg = segments[i];
    const dist = distancePointToSegment(px, py, seg.ax, seg.ay, seg.bx, seg.by);
    if (dist <= radius) return true;
  }
  return false;
}

type NormalizedRect = { left: number; top: number; right: number; bottom: number };
type SelectionHandle = 'nw' | 'ne' | 'sw' | 'se';

function normalizeRect(a: DrawingPoint, b: DrawingPoint): NormalizedRect {
  return {
    left: Math.min(a.x, b.x),
    right: Math.max(a.x, b.x),
    top: Math.min(a.y, b.y),
    bottom: Math.max(a.y, b.y),
  };
}

function getStrokeBounds(stroke: DrawingStroke): NormalizedRect | null {
  if (!stroke.points.length) return null;
  let left = stroke.points[0].x;
  let right = stroke.points[0].x;
  let top = stroke.points[0].y;
  let bottom = stroke.points[0].y;
  for (const p of stroke.points) {
    left = Math.min(left, p.x);
    right = Math.max(right, p.x);
    top = Math.min(top, p.y);
    bottom = Math.max(bottom, p.y);
  }
  return { left, right, top, bottom };
}

function rectsIntersect(a: NormalizedRect, b: NormalizedRect): boolean {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function getSelectionBounds(strokes: DrawingStroke[], ids: string[]): NormalizedRect | null {
  const selected = strokes.filter((s) => ids.includes(s.id));
  if (!selected.length) return null;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const stroke of selected) {
    const b = getStrokeBounds(stroke);
    if (!b) continue;
    left = Math.min(left, b.left);
    right = Math.max(right, b.right);
    top = Math.min(top, b.top);
    bottom = Math.max(bottom, b.bottom);
  }
  if (!Number.isFinite(left)) return null;
  return { left, right, top, bottom };
}

function getDrawingSnapshot(block: DrawingBlock): DrawingSnapshot {
  return {
    strokes: block.strokes,
    groups: block.groups ?? [],
  };
}

function coerceDrawingSnapshot(snapshot: DrawingSnapshot | DrawingStroke[]): DrawingSnapshot {
  if (Array.isArray(snapshot)) {
    return { strokes: snapshot, groups: [] };
  }
  return snapshot;
}

function snapshotsEqual(a: DrawingSnapshot, b: DrawingSnapshot): boolean {
  if (a.strokes.length !== b.strokes.length || a.groups.length !== b.groups.length) return false;
  for (let i = 0; i < a.strokes.length; i += 1) {
    const left = a.strokes[i];
    const right = b.strokes[i];
    if (!right) return false;
    if (left.id !== right.id) return false;
    if ((left.kind ?? 'freehand') !== (right.kind ?? 'freehand')) return false;
    if (left.color !== right.color || left.width !== right.width || left.tool !== right.tool) return false;
    if ((left.parentGroupId ?? null) !== (right.parentGroupId ?? null)) return false;
    if (left.points.length !== right.points.length) return false;
    for (let p = 0; p < left.points.length; p += 1) {
      if (left.points[p].x !== right.points[p].x || left.points[p].y !== right.points[p].y) return false;
    }
  }
  for (let i = 0; i < a.groups.length; i += 1) {
    const left = a.groups[i];
    const right = b.groups[i];
    if (!right) return false;
    if (left.id !== right.id || left.parentGroupId !== right.parentGroupId) return false;
  }
  return true;
}

function getGroupChildrenIds(strokes: DrawingStroke[], groups: DrawingGroup[], groupId: string): string[] {
  return [
    ...groups.filter((group) => group.parentGroupId === groupId).map((group) => group.id),
    ...strokes.filter((stroke) => (stroke.parentGroupId ?? null) === groupId).map((stroke) => stroke.id),
  ];
}

function getGroupDescendantStrokeIds(strokes: DrawingStroke[], groups: DrawingGroup[], itemId: string): string[] {
  if (strokes.some((stroke) => stroke.id === itemId)) return [itemId];
  return getGroupChildrenIds(strokes, groups, itemId).flatMap((childId) =>
    getGroupDescendantStrokeIds(strokes, groups, childId)
  );
}

function getTopLevelSelectionId(strokes: DrawingStroke[], groups: DrawingGroup[], itemId: string): string {
  const stroke = strokes.find((candidate) => candidate.id === itemId);
  if (stroke) {
    let parentGroupId = stroke.parentGroupId ?? null;
    let topLevelId = stroke.id;
    while (parentGroupId) {
      topLevelId = parentGroupId;
      parentGroupId = groups.find((group) => group.id === parentGroupId)?.parentGroupId ?? null;
    }
    return topLevelId;
  }

  let currentId = itemId;
  let parentGroupId = groups.find((group) => group.id === currentId)?.parentGroupId ?? null;
  while (parentGroupId) {
    currentId = parentGroupId;
    parentGroupId = groups.find((group) => group.id === currentId)?.parentGroupId ?? null;
  }
  return currentId;
}

function getDescendantItemIds(strokes: DrawingStroke[], groups: DrawingGroup[], groupId: string): string[] {
  return getGroupChildrenIds(strokes, groups, groupId);
}

function getSelectionBoundsForItems(strokes: DrawingStroke[], groups: DrawingGroup[], itemIds: string[]): NormalizedRect | null {
  const strokeIds = Array.from(new Set(itemIds.flatMap((itemId) => getGroupDescendantStrokeIds(strokes, groups, itemId))));
  return getSelectionBounds(strokes, strokeIds);
}

function dedupeIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

function normalizeDrawingSnapshot(snapshotInput: DrawingSnapshot | DrawingStroke[]): DrawingSnapshot {
  const snapshot = coerceDrawingSnapshot(snapshotInput);
  let groups = snapshot.groups.map((group) => ({ ...group }));
  let strokes = snapshot.strokes.map((stroke) => ({ ...stroke, parentGroupId: stroke.parentGroupId ?? null }));

  let changed = true;
  while (changed) {
    changed = false;
    const groupIds = new Set(groups.map((group) => group.id));

    const nextStrokes = strokes.map((stroke) => ({
      ...stroke,
      parentGroupId: stroke.parentGroupId && groupIds.has(stroke.parentGroupId) ? stroke.parentGroupId : null,
    }));
    if (nextStrokes.some((stroke, index) => (stroke.parentGroupId ?? null) !== (strokes[index].parentGroupId ?? null))) {
      strokes = nextStrokes;
      changed = true;
    }

    const nextGroups = groups
      .filter((group) =>
        groups.some((candidate) => candidate.parentGroupId === group.id)
        || strokes.some((stroke) => (stroke.parentGroupId ?? null) === group.id)
      )
      .map((group) => ({
        ...group,
        parentGroupId: group.parentGroupId && groupIds.has(group.parentGroupId) ? group.parentGroupId : null,
      }));

    if (nextGroups.length !== groups.length || nextGroups.some((group, index) => group.parentGroupId !== groups[index]?.parentGroupId || group.id !== groups[index]?.id)) {
      groups = nextGroups;
      changed = true;
    }
  }

  return { strokes, groups };
}

function DrawingBlockEditor({
  block,
  isRecycleBin,
  isSelected,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  dragHandleProps,
}: BlockEditorProps & { block: DrawingBlock }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftStrokeRef = useRef<DrawingStroke | null>(null);
  const interactionRef = useRef<
    | null
    | { mode: 'pending-hit'; start: DrawingPoint; hitItemId: string; additive: boolean }
    | { mode: 'marquee'; start: DrawingPoint; current: DrawingPoint; additive: boolean }
    | { mode: 'move'; start: DrawingPoint; baseSnapshot: DrawingSnapshot }
    | {
        mode: 'resize';
        handle: SelectionHandle;
        baseSnapshot: DrawingSnapshot;
        anchor: DrawingPoint;
        initialVector: { x: number; y: number };
      }
  >(null);
  const [tool, setTool] = useState<'pen' | 'line' | 'rectangle' | 'circle' | 'eraser' | 'select'>('select');
  const [color, setColor] = useState('#111827');
  const [brushSize, setBrushSize] = useState(2);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [marqueeRect, setMarqueeRect] = useState<NormalizedRect | null>(null);
  const [transientSnapshot, setTransientSnapshot] = useState<DrawingSnapshot | null>(null);

  const normalizedSnapshot = normalizeDrawingSnapshot(getDrawingSnapshot(block));
  const displayedSnapshot = transientSnapshot ?? normalizedSnapshot;
  const displayedStrokes = displayedSnapshot.strokes;
  const displayedGroups = displayedSnapshot.groups;
  const historyPast = block.historyPast ?? [];
  const historyFuture = block.historyFuture ?? [];
  const shapeToolKind: Record<'line' | 'rectangle' | 'circle', DrawingStroke['kind']> = {
    line: 'line',
    rectangle: 'rectangle',
    circle: 'circle',
  };

  const constrainCirclePoint = (
    start: DrawingPoint,
    current: DrawingPoint,
    width: number,
    height: number
  ): DrawingPoint => {
    const dxPx = (current.x - start.x) * width;
    const dyPx = (current.y - start.y) * height;
    const sizePx = Math.max(Math.abs(dxPx), Math.abs(dyPx));
    return {
      x: start.x + (dxPx === 0 ? 0 : (Math.sign(dxPx) * sizePx) / width),
      y: start.y + (dyPx === 0 ? 0 : (Math.sign(dyPx) * sizePx) / height),
    };
  };

  const getNormalizedPoint = (event: React.PointerEvent<HTMLCanvasElement>): DrawingPoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const getCanvasDrawSize = () => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    };
  };

  const getHandlePositions = (bounds: NormalizedRect) => ({
    nw: { x: bounds.left, y: bounds.top },
    ne: { x: bounds.right, y: bounds.top },
    sw: { x: bounds.left, y: bounds.bottom },
    se: { x: bounds.right, y: bounds.bottom },
  });

  const drawOnCanvas = (strokes: DrawingStroke[], selectionBounds: NormalizedRect | null, marquee: NormalizedRect | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderDrawingStrokes(ctx, strokes, width, height);

    if (selectionBounds && tool === 'select') {
      ctx.save();
      const x = selectionBounds.left * width;
      const y = selectionBounds.top * height;
      const w = (selectionBounds.right - selectionBounds.left) * width;
      const h = (selectionBounds.bottom - selectionBounds.top) * height;
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      const handles = Object.values(getHandlePositions(selectionBounds));
      for (const handle of handles) {
        const hx = handle.x * width;
        const hy = handle.y * height;
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(hx - 4, hy - 4, 8, 8);
      }
      ctx.restore();
    }

    if (marquee && tool === 'select') {
      ctx.save();
      ctx.strokeStyle = '#0ea5e9';
      ctx.fillStyle = 'rgba(14,165,233,0.12)';
      const x = marquee.left * width;
      const y = marquee.top * height;
      const w = (marquee.right - marquee.left) * width;
      const h = (marquee.bottom - marquee.top) * height;
      ctx.fillRect(x, y, w, h);
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
  };

  const commitSnapshot = (nextSnapshotInput: DrawingSnapshot) => {
    const nextSnapshot = normalizeDrawingSnapshot(nextSnapshotInput);
    if (snapshotsEqual(nextSnapshot, normalizedSnapshot)) return;
    const maxHistory = 50;
    const nextPast = [...historyPast, normalizedSnapshot].slice(-maxHistory);
    onUpdate({
      ...block,
      strokes: nextSnapshot.strokes,
      groups: nextSnapshot.groups,
      redoStrokes: [],
      historyPast: nextPast,
      historyFuture: [],
      previewDataUrl: createDrawingPreviewDataUrl(nextSnapshot.strokes),
    });
  };

  const undoStroke = () => {
    if (!historyPast.length || isRecycleBin) return;
    const previous = normalizeDrawingSnapshot(historyPast[historyPast.length - 1]);
    onUpdate({
      ...block,
      strokes: previous.strokes,
      groups: previous.groups,
      redoStrokes: [],
      historyPast: historyPast.slice(0, -1),
      historyFuture: [...historyFuture, normalizedSnapshot],
      previewDataUrl: createDrawingPreviewDataUrl(previous.strokes),
    });
  };

  const redoStroke = () => {
    if (!historyFuture.length || isRecycleBin) return;
    const restored = normalizeDrawingSnapshot(historyFuture[historyFuture.length - 1]);
    onUpdate({
      ...block,
      strokes: restored.strokes,
      groups: restored.groups,
      redoStrokes: [],
      historyPast: [...historyPast, normalizedSnapshot],
      historyFuture: historyFuture.slice(0, -1),
      previewDataUrl: createDrawingPreviewDataUrl(restored.strokes),
    });
  };

  useEffect(() => {
    const selectionBounds = getSelectionBoundsForItems(displayedStrokes, displayedGroups, selectedItemIds);
    drawOnCanvas(displayedStrokes, selectionBounds, marqueeRect);
  }, [displayedStrokes, displayedGroups, selectedItemIds, marqueeRect, tool]);

  useEffect(() => {
    if ((block.historyPast?.length ?? 0) === 0 && (block.historyFuture?.length ?? 0) === 0 && (block.redoStrokes?.length ?? 0) === 0) {
      return;
    }
    onUpdate({
      ...block,
      historyPast: [],
      historyFuture: [],
      redoStrokes: [],
    });
  }, [block.id]);

  useEffect(() => {
    const onResize = () => {
      const selectionBounds = getSelectionBoundsForItems(displayedStrokes, displayedGroups, selectedItemIds);
      drawOnCanvas(displayedStrokes, selectionBounds, marqueeRect);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [displayedStrokes, displayedGroups, selectedItemIds, marqueeRect, tool]);

  useEffect(() => {
    setSelectedItemIds((prev) =>
      prev.filter((id) =>
        normalizedSnapshot.strokes.some((stroke) => stroke.id === id)
        || normalizedSnapshot.groups.some((group) => group.id === id)
      )
    );
  }, [block.strokes, block.groups]);

  const getSelectedStrokeIds = (itemIds: string[], snapshot: DrawingSnapshot) =>
    dedupeIds(itemIds.flatMap((itemId) => getGroupDescendantStrokeIds(snapshot.strokes, snapshot.groups, itemId)));

  const applyMove = (baseSnapshot: DrawingSnapshot, itemIds: string[], dx: number, dy: number): DrawingSnapshot => {
    const movingStrokeIds = new Set(getSelectedStrokeIds(itemIds, baseSnapshot));
    return {
      strokes: baseSnapshot.strokes.map((stroke) =>
        movingStrokeIds.has(stroke.id)
          ? { ...stroke, points: stroke.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
          : stroke
      ),
      groups: baseSnapshot.groups,
    };
  };

  const applyResize = (
    baseSnapshot: DrawingSnapshot,
    itemIds: string[],
    anchor: DrawingPoint,
    initialVector: { x: number; y: number },
    currentPoint: DrawingPoint,
    constrainAspect: boolean
  ): DrawingSnapshot => {
    const targetVector = { x: currentPoint.x - anchor.x, y: currentPoint.y - anchor.y };
    let sx = Math.abs(initialVector.x) < 1e-5 ? 1 : targetVector.x / initialVector.x;
    let sy = Math.abs(initialVector.y) < 1e-5 ? 1 : targetVector.y / initialVector.y;

    if (constrainAspect) {
      const uniform = Math.max(Math.abs(sx), Math.abs(sy));
      sx = (sx < 0 ? -1 : 1) * uniform;
      sy = (sy < 0 ? -1 : 1) * uniform;
    }

    const resizingStrokeIds = new Set(getSelectedStrokeIds(itemIds, baseSnapshot));
    return {
      strokes: baseSnapshot.strokes.map((stroke) =>
        resizingStrokeIds.has(stroke.id)
          ? {
              ...stroke,
              points: stroke.points.map((p) => ({
                x: anchor.x + (p.x - anchor.x) * sx,
                y: anchor.y + (p.y - anchor.y) * sy,
              })),
            }
          : stroke
      ),
      groups: baseSnapshot.groups,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isRecycleBin) return;
    event.preventDefault();
    const point = getNormalizedPoint(event);

    if (tool === 'eraser') {
      const { width, height } = getCanvasDrawSize();
      const hitIndexFromTop = [...normalizedSnapshot.strokes]
        .reverse()
        .findIndex((stroke) => strokeContainsPoint(stroke, point, width, height));
      if (hitIndexFromTop !== -1) {
        const actualIndex = normalizedSnapshot.strokes.length - 1 - hitIndexFromTop;
        const remainingStrokes = normalizedSnapshot.strokes.filter((_, i) => i !== actualIndex);
        const nextSnapshot = normalizeDrawingSnapshot({
          strokes: remainingStrokes,
          groups: normalizedSnapshot.groups,
        });
        commitSnapshot(nextSnapshot);
      }
      return;
    }

    if (tool === 'select') {
      const isAdditiveSelect = event.ctrlKey || event.metaKey || event.shiftKey;
      const { width, height } = getCanvasDrawSize();
      const hitIndexFromTop = [...normalizedSnapshot.strokes]
        .reverse()
        .findIndex((stroke) => strokeContainsPoint(stroke, point, width, height));
      const hitStrokeIndex = hitIndexFromTop !== -1 ? normalizedSnapshot.strokes.length - 1 - hitIndexFromTop : -1;
      const hitStrokeId = hitStrokeIndex !== -1 ? normalizedSnapshot.strokes[hitStrokeIndex].id : null;
      const hitItemId = hitStrokeId ? getTopLevelSelectionId(normalizedSnapshot.strokes, normalizedSnapshot.groups, hitStrokeId) : null;

      const selectionBounds = getSelectionBoundsForItems(normalizedSnapshot.strokes, normalizedSnapshot.groups, selectedItemIds);
      if (selectionBounds) {
        const handles = getHandlePositions(selectionBounds);
        const px = point.x * width;
        const py = point.y * height;
        const handleHit = (Object.entries(handles) as Array<[SelectionHandle, DrawingPoint]>).find(([_, hp]) => {
          const hx = hp.x * width;
          const hy = hp.y * height;
          return Math.abs(px - hx) <= 8 && Math.abs(py - hy) <= 8;
        });
        if (handleHit) {
          const [handleName] = handleHit;
          const corner = handles[handleName];
          const opposite: Record<SelectionHandle, DrawingPoint> = {
            nw: handles.se,
            ne: handles.sw,
            sw: handles.ne,
            se: handles.nw,
          };
          interactionRef.current = {
            mode: 'resize',
            handle: handleName,
            baseSnapshot: normalizedSnapshot,
            anchor: opposite[handleName],
            initialVector: { x: corner.x - opposite[handleName].x, y: corner.y - opposite[handleName].y },
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
      }

      if (hitItemId) {
        if (isAdditiveSelect) {
          interactionRef.current = { mode: 'pending-hit', start: point, hitItemId, additive: true };
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
        if (selectedItemIds.includes(hitItemId)) {
          if (selectedItemIds.length > 1) {
            setSelectedItemIds([hitItemId]);
          }
          interactionRef.current = { mode: 'move', start: point, baseSnapshot: normalizedSnapshot };
        } else {
          // Allow drag-marquee even when drag starts on an unselected stroke.
          // Pointer-up without drag still behaves like single-stroke selection.
          interactionRef.current = { mode: 'pending-hit', start: point, hitItemId, additive: false };
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }

      if (
        !isAdditiveSelect &&
        selectionBounds &&
        point.x >= selectionBounds.left &&
        point.x <= selectionBounds.right &&
        point.y >= selectionBounds.top &&
        point.y <= selectionBounds.bottom
      ) {
        interactionRef.current = { mode: 'move', start: point, baseSnapshot: normalizedSnapshot };
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }

      interactionRef.current = { mode: 'marquee', start: point, current: point, additive: isAdditiveSelect };
      setMarqueeRect(normalizeRect(point, point));
      if (!isAdditiveSelect) {
        setSelectedItemIds([]);
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const isShapeTool = tool === 'line' || tool === 'rectangle' || tool === 'circle';
    const stroke: DrawingStroke = {
      id: generateId(),
      color,
      width: brushSize,
      tool: 'pen',
      kind: isShapeTool ? shapeToolKind[tool] : 'freehand',
      points: isShapeTool ? [point, point] : [point],
      parentGroupId: null,
    };
    draftStrokeRef.current = stroke;
    setTransientSnapshot({ strokes: [...normalizedSnapshot.strokes, stroke], groups: normalizedSnapshot.groups });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const point = getNormalizedPoint(event);

    if (draftStrokeRef.current) {
      const kind = draftStrokeRef.current.kind ?? 'freehand';
      const { width, height } = getCanvasDrawSize();
      draftStrokeRef.current =
        kind === 'freehand'
          ? { ...draftStrokeRef.current, points: [...draftStrokeRef.current.points, point] }
          : kind === 'circle' && keepAspectRatio
            ? {
                ...draftStrokeRef.current,
                points: [
                  draftStrokeRef.current.points[0],
                  constrainCirclePoint(draftStrokeRef.current.points[0], point, width, height),
                ],
              }
          : { ...draftStrokeRef.current, points: [draftStrokeRef.current.points[0], point] };
      setTransientSnapshot({ strokes: [...normalizedSnapshot.strokes, draftStrokeRef.current], groups: normalizedSnapshot.groups });
      return;
    }

    if (!interactionRef.current) return;

    if (interactionRef.current.mode === 'pending-hit') {
      const { width, height } = getCanvasDrawSize();
      const dx = (point.x - interactionRef.current.start.x) * width;
      const dy = (point.y - interactionRef.current.start.y) * height;
      const moved = Math.hypot(dx, dy) >= 6;
      if (moved) {
        const start = interactionRef.current.start;
        const additive = interactionRef.current.additive;
        interactionRef.current = {
          mode: 'marquee',
          start,
          current: point,
          additive,
        };
        setMarqueeRect(normalizeRect(start, point));
      }
      return;
    }

    if (interactionRef.current.mode === 'marquee') {
      interactionRef.current = { ...interactionRef.current, current: point };
      setMarqueeRect(normalizeRect(interactionRef.current.start, point));
      return;
    }

    if (interactionRef.current.mode === 'move') {
      const dx = point.x - interactionRef.current.start.x;
      const dy = point.y - interactionRef.current.start.y;
      setTransientSnapshot(applyMove(interactionRef.current.baseSnapshot, selectedItemIds, dx, dy));
      return;
    }

    if (interactionRef.current.mode === 'resize') {
      const resizedSnapshot = applyResize(
        interactionRef.current.baseSnapshot,
        selectedItemIds,
        interactionRef.current.anchor,
        interactionRef.current.initialVector,
        point,
        keepAspectRatio
      );
      setTransientSnapshot(resizedSnapshot);
    }
  };

  const handlePointerUp = () => {
    if (draftStrokeRef.current) {
      const stroke = draftStrokeRef.current;
      draftStrokeRef.current = null;
      setTransientSnapshot(null);
      commitSnapshot({ strokes: [...normalizedSnapshot.strokes, stroke], groups: normalizedSnapshot.groups });
      return;
    }

    if (interactionRef.current?.mode === 'marquee' && marqueeRect) {
      const selected = normalizedSnapshot.strokes
        .filter((stroke) => strokeIntersectsRect(stroke, marqueeRect))
        .map((stroke) => getTopLevelSelectionId(normalizedSnapshot.strokes, normalizedSnapshot.groups, stroke.id));
      const nextIds = dedupeIds(selected);
      if (interactionRef.current.additive) {
        setSelectedItemIds((prev) => dedupeIds([...prev, ...nextIds]));
      } else {
        setSelectedItemIds(nextIds);
      }
      setMarqueeRect(null);
      interactionRef.current = null;
      return;
    }

    if (interactionRef.current?.mode === 'pending-hit') {
      const hitItemId = interactionRef.current.hitItemId;
      if (interactionRef.current.additive) {
        setSelectedItemIds((prev) =>
          prev.includes(hitItemId) ? prev : [...prev, hitItemId]
        );
      } else {
        setSelectedItemIds([hitItemId]);
      }
      interactionRef.current = null;
      setTransientSnapshot(null);
      setMarqueeRect(null);
      return;
    }

    if ((interactionRef.current?.mode === 'move' || interactionRef.current?.mode === 'resize') && transientSnapshot) {
      const next = transientSnapshot;
      setTransientSnapshot(null);
      interactionRef.current = null;
      commitSnapshot(next);
      return;
    }

    interactionRef.current = null;
    setTransientSnapshot(null);
    setMarqueeRect(null);
  };

  const clearCanvas = () => {
    if (isRecycleBin) return;
    setSelectedItemIds([]);
    commitSnapshot({ strokes: [], groups: [] });
  };

  const recolorSelectedStrokes = (nextColor: string) => {
    if (!selectedItemIds.length) return;
    const selectedStrokeIds = new Set(getSelectedStrokeIds(selectedItemIds, normalizedSnapshot));
    const next = normalizedSnapshot.strokes.map((stroke) =>
      selectedStrokeIds.has(stroke.id)
        ? { ...stroke, color: nextColor, tool: 'pen' as const }
        : stroke
    );
    commitSnapshot({ strokes: next, groups: normalizedSnapshot.groups });
  };

  const resizeSelectedStrokes = (nextWidth: number) => {
    if (!selectedItemIds.length) return;
    const selectedStrokeIds = new Set(getSelectedStrokeIds(selectedItemIds, normalizedSnapshot));
    const next = normalizedSnapshot.strokes.map((stroke) =>
      selectedStrokeIds.has(stroke.id)
        ? { ...stroke, width: nextWidth }
        : stroke
    );
    commitSnapshot({ strokes: next, groups: normalizedSnapshot.groups });
  };

  const selectedGroupIds = selectedItemIds.filter((itemId) => normalizedSnapshot.groups.some((group) => group.id === itemId));

  const groupSelection = () => {
    if (isRecycleBin) return;
    const topLevelIds = dedupeIds(selectedItemIds);
    if (topLevelIds.length < 2) return;
    const firstParentId = normalizedSnapshot.strokes.find((stroke) => stroke.id === topLevelIds[0])?.parentGroupId
      ?? normalizedSnapshot.groups.find((group) => group.id === topLevelIds[0])?.parentGroupId
      ?? null;
    const commonParentId = topLevelIds.every((itemId) => {
      const parentId = normalizedSnapshot.strokes.find((stroke) => stroke.id === itemId)?.parentGroupId
        ?? normalizedSnapshot.groups.find((group) => group.id === itemId)?.parentGroupId
        ?? null;
      return parentId === firstParentId;
    }) ? firstParentId : null;

    const newGroupId = generateId();
    const nextStrokes = normalizedSnapshot.strokes.map((stroke) =>
      topLevelIds.includes(stroke.id) ? { ...stroke, parentGroupId: newGroupId } : stroke
    );
    const nextGroups = [
      ...normalizedSnapshot.groups.map((group) =>
        topLevelIds.includes(group.id) ? { ...group, parentGroupId: newGroupId } : group
      ),
      { id: newGroupId, parentGroupId: commonParentId },
    ];
    commitSnapshot({ strokes: nextStrokes, groups: nextGroups });
    setSelectedItemIds([newGroupId]);
  };

  const ungroupSelection = () => {
    if (isRecycleBin || !selectedGroupIds.length) return;
    let nextSnapshot = normalizedSnapshot;
    let nextSelection: string[] = [];

    for (const groupId of selectedGroupIds) {
      const targetGroup = nextSnapshot.groups.find((group) => group.id === groupId);
      if (!targetGroup) continue;
      const childrenIds = getDescendantItemIds(nextSnapshot.strokes, nextSnapshot.groups, groupId);
      nextSelection = [...nextSelection, ...childrenIds];
      nextSnapshot = {
        strokes: nextSnapshot.strokes.map((stroke) =>
          stroke.parentGroupId === groupId ? { ...stroke, parentGroupId: targetGroup.parentGroupId } : stroke
        ),
        groups: nextSnapshot.groups
          .filter((group) => group.id !== groupId)
          .map((group) =>
            group.parentGroupId === groupId ? { ...group, parentGroupId: targetGroup.parentGroupId } : group
          ),
      };
    }

    nextSnapshot = normalizeDrawingSnapshot(nextSnapshot);
    commitSnapshot(nextSnapshot);
    setSelectedItemIds(dedupeIds(nextSelection));
  };

  const swatches = ['#111827', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];
  const toolLabelMap: Record<typeof tool, string> = {
    pen: 'Pen',
    line: 'Line',
    rectangle: 'Rectangle',
    circle: 'Circle',
    eraser: 'Erase Segment',
    select: 'Select',
  };

  return (
    <div className="group relative flex items-start gap-1">
      {isSelected && dragHandleProps && (
        <div
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/40 hover:text-muted-foreground mt-1 hidden md:block"
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}
      <div className="flex-1">
        <div className="rounded border bg-muted/20 p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline" disabled={isRecycleBin}>
                  <Type className="w-4 h-4 mr-1" />
                  {`Tools: ${toolLabelMap[tool]}`}
                  <ChevronDown className="w-3 h-3 ml-1 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setTool('select')}>
                  <Move className="w-4 h-4 mr-2" />
                  Select
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTool('pen')}>
                  <Brush className="w-4 h-4 mr-2" />
                  Pen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTool('line')}>
                  <Minus className="w-4 h-4 mr-2" />
                  Line
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTool('rectangle')}>
                  <Square className="w-4 h-4 mr-2" />
                  Rectangle
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTool('circle')}>
                  <Circle className="w-4 h-4 mr-2" />
                  Circle
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTool('eraser')}>
                  <Eraser className="w-4 h-4 mr-2" />
                  Erase Segment
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <div className="mb-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={keepAspectRatio ? 'default' : 'outline'}
                      onClick={() => setKeepAspectRatio((v) => !v)}
                      disabled={isRecycleBin}
                      className="w-full justify-center"
                    >
                      {keepAspectRatio ? 'Aspect: On' : 'Aspect: Off'}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">Color</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {swatches.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => {
                          setColor(swatch);
                          if (selectedItemIds.length > 0) {
                            recolorSelectedStrokes(swatch);
                          }
                        }}
                        disabled={isRecycleBin}
                        className={cn('h-5 w-5 rounded-full border', color === swatch ? 'ring-2 ring-primary ring-offset-1' : 'ring-0')}
                        style={{ backgroundColor: swatch }}
                      />
                    ))}
                  </div>
                </div>
                <div className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Line Width</span>
                    <input
                      type="range"
                      min="1"
                      max="32"
                      step="1"
                      value={brushSize}
                      onChange={(e) => {
                        const nextWidth = Number(e.target.value);
                        setBrushSize(nextWidth);
                        if (selectedItemIds.length > 0) {
                          resizeSelectedStrokes(nextWidth);
                        }
                      }}
                      disabled={isRecycleBin}
                      className="w-32 accent-primary"
                    />
                    <span className="text-xs text-muted-foreground w-8">{brushSize}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearCanvas} disabled={isRecycleBin || !block.strokes.length}>
                  Clear
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button type="button" size="sm" variant="outline" onClick={undoStroke} disabled={isRecycleBin || !historyPast.length}>
              <Undo2 className="w-4 h-4 mr-1" />
              Undo
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={redoStroke} disabled={isRecycleBin || !historyFuture.length}>
              <Redo2 className="w-4 h-4 mr-1" />
              Redo
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={groupSelection} disabled={isRecycleBin || selectedItemIds.length < 2}>
              Group
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={ungroupSelection} disabled={isRecycleBin || !selectedGroupIds.length}>
              Ungroup
            </Button>
          </div>

          <div className="w-full max-w-[70vh] aspect-[3/4] min-h-[340px] rounded border bg-white overflow-hidden mx-auto">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="block w-full h-full touch-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockEditor({ block, isRecycleBin, isSelected, onUpdate, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown, dragHandleProps }: BlockEditorProps) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const bulletRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const focusNextBullet = useRef<string | null>(null);

  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  useEffect(() => {
    if (block.type === 'text' && textRef.current) {
      autoResize(textRef.current);
    }
  }, [block]);

  useEffect(() => {
    if (focusNextBullet.current && block.type === 'bullets') {
      const ref = bulletRefs.current.get(focusNextBullet.current);
      if (ref) {
        ref.focus();
        const len = ref.value.length;
        ref.setSelectionRange(len, len);
      }
      focusNextBullet.current = null;
    }
  }, [block]);

  if (block.type === 'drawing') {
    return (
      <DrawingBlockEditor
        block={block}
        isRecycleBin={isRecycleBin}
        isSelected={isSelected}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        dragHandleProps={dragHandleProps}
      />
    );
  }

  if (block.type === 'text') {
    return (
      <div className="group relative flex items-start gap-1">
        {isSelected && dragHandleProps && (
          <div 
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/40 hover:text-muted-foreground mt-1 hidden md:block"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical className="w-3 h-3" />
          </div>
        )}
        <div className="flex-1">
          <Textarea
            ref={textRef}
            value={block.content}
            onChange={(e) => {
              onUpdate({ ...block, content: e.target.value });
            }}
            onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
            disabled={isRecycleBin}
            placeholder={isSelected ? "Type text here..." : ""}
            className="w-full border-none shadow-none focus-visible:ring-0 p-3 resize-none min-h-[44px] overflow-hidden text-base bg-muted/30 rounded placeholder:text-muted-foreground/40"
            rows={1}
          />
        </div>
        {isSelected && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 text-muted-foreground/60 hover:text-foreground mt-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  if (block.type === 'image') {
    const imageBlock = block as ImageBlock;
    return (
      <div className="group relative flex items-start gap-1">
        {isSelected && dragHandleProps && (
          <div 
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/40 hover:text-muted-foreground mt-1 hidden md:block"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical className="w-3 h-3" />
          </div>
        )}
        <div className="flex-1">
          {isSelected && (
            <div className="mb-2 flex items-center gap-2 bg-muted/30 rounded p-3">
              <span className="text-sm text-muted-foreground">Size:</span>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={imageBlock.width}
                onChange={(e) => onUpdate({ ...imageBlock, width: parseInt(e.target.value) })}
                className="flex-1 h-2 accent-primary"
              />
              <span className="text-sm text-muted-foreground w-10">{imageBlock.width}%</span>
            </div>
          )}
          <div 
            className="bg-muted/30 rounded p-2"
            style={{ width: `${imageBlock.width}%` }}
          >
            <img 
              src={imageBlock.dataUrl} 
              alt="Note image" 
              className="w-full h-auto rounded"
            />
          </div>
        </div>
      </div>
    );
  }

  if (block.type === 'checkbox') {
    const checkboxBlock = block as CheckboxBlock;
    return (
      <div className="group relative flex items-center gap-1">
        {isSelected && dragHandleProps && (
          <div 
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/40 hover:text-muted-foreground hidden md:block"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical className="w-3 h-3" />
          </div>
        )}
        <div className="flex-1 flex items-center gap-3 bg-muted/30 rounded p-3">
          <input
            type="checkbox"
            checked={checkboxBlock.checked}
            onChange={(e) => onUpdate({ ...checkboxBlock, checked: e.target.checked })}
            disabled={isRecycleBin}
            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className={cn("text-base", checkboxBlock.checked && "line-through text-muted-foreground")}>
            {checkboxBlock.checked ? "Completed" : "Not completed"}
          </span>
        </div>
      </div>
    );
  }

  if (block.type === 'link') {
    const linkBlock = block as LinkBlock;
    return (
      <div className="group relative flex items-center gap-1">
        {isSelected && dragHandleProps && (
          <div 
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/40 hover:text-muted-foreground hidden md:block"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical className="w-3 h-3" />
          </div>
        )}
        <div className="flex-1 flex items-center gap-3 bg-muted/30 rounded p-3">
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
             <LinkIcon className="w-4 h-4 text-primary shrink-0" />
             {linkBlock.url ? (
               <a 
                 href={linkBlock.url} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-primary hover:underline truncate flex-1 block"
               >
                 {linkBlock.url}
               </a>
             ) : (
               <Input
                 value={linkBlock.url}
                 onChange={(e) => onUpdate({ ...linkBlock, url: e.target.value })}
                 placeholder="Paste URL here..."
                 className="h-8 bg-background"
                 autoFocus
               />
             )}
          </div>
          {linkBlock.url && (
             <Button 
               variant="ghost" 
               size="sm" 
               className="h-6 w-6 p-0"
               onClick={() => onUpdate({ ...linkBlock, url: '' })}
             >
               <Pencil className="w-3 h-3" />
             </Button>
          )}
        </div>
        {isSelected && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 text-muted-foreground/60 hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onMoveUp} disabled={!canMoveUp}>
                <ChevronUp className="w-4 h-4 mr-2" />
                Move Up
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveDown} disabled={!canMoveDown}>
                <ChevronDown className="w-4 h-4 mr-2" />
                Move Down
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  const bulletBlock = block as BulletBlock;

  const updateBullet = (id: string, content: string) => {
    const newItems = bulletBlock.items.map(b => b.id === id ? { ...b, content } : b);
    onUpdate({ ...bulletBlock, items: newItems });
  };

  const addBullet = (afterIndex: number, indent: number) => {
    // @ts-ignore
    const newBullet: BulletItem = { id: generateId(), content: '', indent };
    const newItems = [...bulletBlock.items];
    newItems.splice(afterIndex + 1, 0, newBullet);
    onUpdate({ ...bulletBlock, items: newItems });
    focusNextBullet.current = newBullet.id;
  };

  const handleBulletKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, bullet: BulletItem, index: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        if (bullet.indent > 0) {
          const newItems = bulletBlock.items.map(b => b.id === bullet.id ? { ...b, indent: b.indent - 1 } : b);
          onUpdate({ ...bulletBlock, items: newItems });
        }
      } else {
        if (bullet.indent < 5) {
          const newItems = bulletBlock.items.map(b => b.id === bullet.id ? { ...b, indent: b.indent + 1 } : b);
          onUpdate({ ...bulletBlock, items: newItems });
        }
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addBullet(index, bullet.indent);
    } else if (e.key === 'Backspace' && bullet.content === '') {
      e.preventDefault();
      if (bulletBlock.items.length > 1) {
        const newItems = bulletBlock.items.filter(b => b.id !== bullet.id);
        onUpdate({ ...bulletBlock, items: newItems });
        if (index > 0) {
          focusNextBullet.current = bulletBlock.items[index - 1].id;
        }
      } else if (bullet.indent > 0) {
        const newItems = bulletBlock.items.map(b => b.id === bullet.id ? { ...b, indent: 0 } : b);
        onUpdate({ ...bulletBlock, items: newItems });
      }
    }
  };

  const removeBullet = (id: string) => {
    if (bulletBlock.items.length > 1) {
      const newItems = bulletBlock.items.filter(b => b.id !== id);
      onUpdate({ ...bulletBlock, items: newItems });
    }
  };

  return (
    <div className="group relative flex items-start gap-1">
      {isSelected && dragHandleProps && (
        <div 
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/40 hover:text-muted-foreground mt-1 hidden md:block"
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}
      <div className="flex-1 bg-muted/30 rounded p-3">
        <div className="space-y-1">
          {bulletBlock.items.map((bullet, index) => (
            <div
              key={bullet.id}
              className="flex items-start gap-2 group/bullet"
              style={{ paddingLeft: `${bullet.indent * 16}px` }}
            >
              <span className="text-muted-foreground font-bold mt-1 select-none text-sm">•</span>
              <Textarea
                ref={(el) => {
                  if (el) bulletRefs.current.set(bullet.id, el);
                  else bulletRefs.current.delete(bullet.id);
                }}
                value={bullet.content}
                onChange={(e) => updateBullet(bullet.id, e.target.value)}
                onKeyDown={(e) => handleBulletKeyDown(e, bullet, index)}
                onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                disabled={isRecycleBin}
                placeholder={isSelected ? "..." : ""}
                className="flex-1 min-h-[36px] py-1.5 px-1 border-none shadow-none focus-visible:ring-0 resize-none text-base bg-transparent placeholder:text-muted-foreground/30 overflow-hidden text-foreground"
                rows={1}
              />
              {isSelected && (
                <button
                  className="p-2 text-muted-foreground hover:text-destructive min-h-[36px] min-w-[36px] flex items-center justify-center"
                  onClick={() => removeBullet(bullet.id)}
                  disabled={isRecycleBin}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {isSelected && (
          <button
            className="text-sm text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1 py-2"
            onClick={() => addBullet(bulletBlock.items.length - 1, 0)}
            disabled={isRecycleBin}
          >
            <Plus className="w-4 h-4" /> Add bullet
          </button>
        )}
      </div>
      {isSelected && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 text-muted-foreground/60 hover:text-foreground mt-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onMoveUp} disabled={!canMoveUp}>
              <ChevronUp className="w-4 h-4 mr-2" />
              Move Up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveDown} disabled={!canMoveDown}>
              <ChevronDown className="w-4 h-4 mr-2" />
              Move Down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface SortableBlockProps extends BlockEditorProps {
  id: string;
}

function SortableBlock({ id, ...props }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BlockEditor {...props} dragHandleProps={{ attributes, listeners: listeners || {} }} />
    </div>
  );
}

// Grid Item for Children Cards
interface GridCardItemProps {
  card: Card;
  onNavigate: () => void;
  onAddNote: () => void;
  onMoveStart: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onUpdateBlocks: (blocks: ContentBlock[]) => void;
  onOpenTypePicker: () => void;
  isRecycleBin?: boolean;
  onRestore?: () => void;
  onReorder?: (direction: 'up' | 'down') => void;
  dropIndicator?: 'before' | 'after' | null;
}

const MASONRY_ROW_HEIGHT = 4;
const MASONRY_GAP = 8;

function GridCardItem({ card, onNavigate, onAddNote, onMoveStart, onRename, onDelete, onUpdateBlocks, onOpenTypePicker, isRecycleBin, onRestore, onReorder, dropIndicator }: GridCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });
  const contentRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const [rowSpan, setRowSpan] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchorPoint, setMenuAnchorPoint] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const updateRowSpan = () => {
      const height = node.getBoundingClientRect().height;
      const nextSpan = Math.max(1, Math.ceil((height + MASONRY_GAP) / (MASONRY_ROW_HEIGHT + MASONRY_GAP)));
      setRowSpan((prev) => (prev === nextSpan ? prev : nextSpan));
    };

    updateRowSpan();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateRowSpan);
      return () => window.removeEventListener('resize', updateRowSpan);
    }

    const observer = new ResizeObserver(() => updateRowSpan());
    observer.observe(node);
    window.addEventListener('resize', updateRowSpan);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateRowSpan);
    };
  }, [card.id, card.title, card.blocks, card.children.length, isDragging]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridRowEnd: `span ${rowSpan}`,
  };

  const checkboxBlock = card.cardType === 'checkbox'
    ? card.blocks.find(b => b.type === 'checkbox') as CheckboxBlock | undefined
    : undefined;
  const linkBlock = card.cardType === 'link'
    ? card.blocks.find(b => b.type === 'link') as LinkBlock | undefined
    : undefined;
  const imageBlock = card.cardType === 'image'
    ? card.blocks.find(b => b.type === 'image') as ImageBlock | undefined
    : undefined;
  const drawingBlock = card.cardType === 'drawing'
    ? card.blocks.find(b => b.type === 'drawing') as DrawingBlock | undefined
    : undefined;
  
  const handleCheckboxChange = (checked: boolean) => {
    if (checkboxBlock) {
      const newBlocks = card.blocks.map(b => b.id === checkboxBlock.id ? { ...b, checked } : b);
      onUpdateBlocks(newBlocks);
    }
  };

  const handleLinkUpdate = (url: string) => {
    if (linkBlock) {
      const newBlocks = card.blocks.map(b => b.id === linkBlock.id ? { ...b, url } : b);
      onUpdateBlocks(newBlocks);
    }
  };

  const isMediaCard = card.cardType === 'image' || card.cardType === 'drawing';
  const isFolderCard = card.cardType === 'folder';

  const handleRenameStart = () => {
    const node = titleRef.current;
    if (!node || isRecycleBin) return;
    node.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuAnchorPoint({ x: event.clientX, y: event.clientY });
    setMenuOpen(true);
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {dropIndicator && !isDragging && (
        <div
          className={cn(
            "pointer-events-none absolute left-0 right-0 z-30 h-0.5 rounded-full bg-primary shadow-[0_0_0_1px_hsl(var(--background))]",
            dropIndicator === 'before' ? "top-[-4px]" : "bottom-[-4px]"
          )}
        />
        )}
      <div
        ref={contentRef}
        className={cn(
          "relative flex items-center gap-2 rounded-lg border bg-card hover:bg-accent hover:border-primary/30 transition-colors justify-center min-h-[96px]",
          isMediaCard ? "p-0 overflow-hidden" : "p-4",
          checkboxBlock ? "justify-start pl-4" : "justify-center",
          isFolderCard && "bg-card border-border hover:bg-accent"
        )}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onNavigate();
        }}
        onContextMenu={handleContextMenu}
        {...attributes}
        {...listeners}
      >
        {isFolderCard && (
          <div className="absolute -top-2 left-4 h-3 w-14 rounded-t-md border border-b-0 border-border bg-card" />
        )}
        {checkboxBlock && (
          <input
            type="checkbox"
            checked={checkboxBlock.checked}
            onChange={(e) => handleCheckboxChange(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0 z-10"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="flex-1 w-full flex flex-col items-center">
        {!isMediaCard && (
          <div
            ref={titleRef}
            className={cn(
              "text-sm font-medium w-full px-2 border-none shadow-none bg-transparent p-0 min-h-[20px] break-words whitespace-pre-wrap outline-none",
              "cursor-text select-text",
              checkboxBlock ? "text-left" : "text-center",
              checkboxBlock?.checked && "line-through text-muted-foreground"
            )}
            contentEditable={!isRecycleBin}
            suppressContentEditableWarning
            onBlur={(e) => onRename(e.currentTarget.textContent || "")}
            onKeyDown={(e) => {
               if (e.key === 'Enter' && !e.shiftKey) {
                 e.preventDefault();
                 e.currentTarget.blur();
               }
               e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.focus();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {card.title}
          </div>
        )}
        {linkBlock && (
          <div className="w-full mt-1 px-2" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
             {linkBlock.url ? (
               <div className={cn("flex items-center gap-1", checkboxBlock ? "justify-start" : "justify-center")}>
                 <LinkIcon className="w-3 h-3 text-primary shrink-0" />
                 <a 
                   href={linkBlock.url.startsWith('http') ? linkBlock.url : `https://${linkBlock.url}`}
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="text-xs text-primary hover:underline break-all whitespace-normal block max-w-full"
                 >
                   Link
                 </a>
               </div>
             ) : (
                <Input
                  value={linkBlock.url}
                  onChange={(e) => handleLinkUpdate(e.target.value)}
                  placeholder="Paste URL..."
                  className="h-6 text-xs bg-background/80"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                       e.currentTarget.blur();
                    }
                    e.stopPropagation();
                  }}
                />
             )}
          </div>
        )}
        {imageBlock && (
          <div
            className={cn("w-full cursor-pointer", isMediaCard ? "" : "mt-2 px-2")}
            onDragStart={(e) => e.preventDefault()}
          >
            <div className={cn("overflow-hidden", isMediaCard ? "bg-muted/20" : "rounded border bg-muted/20")}>
              <img
                src={imageBlock.dataUrl}
                alt="Card image"
                draggable={false}
                className={cn("w-full h-auto block object-contain", isMediaCard ? "" : "h-36")}
              />
            </div>
          </div>
        )}
        {card.cardType === 'image' && !imageBlock && (
          <div className="w-full mt-2 px-2 text-xs text-muted-foreground text-center">
            No image yet
          </div>
        )}
        {drawingBlock && (
          <div
            className={cn("w-full cursor-pointer", isMediaCard ? "" : "mt-2 px-2")}
            onDragStart={(e) => e.preventDefault()}
          >
            <div className={cn("overflow-hidden", isMediaCard ? "bg-muted/20" : "rounded border bg-muted/20")}>
              <img
                src={createDrawingPreviewDataUrl(drawingBlock.strokes)}
                alt="Drawing preview"
                draggable={false}
                className={cn("w-full h-auto block object-contain", isMediaCard ? "" : "h-24")}
              />
            </div>
          </div>
        )}
        {card.cardType === 'drawing' && !drawingBlock && (
          <div className="w-full mt-2 px-2 text-xs text-muted-foreground text-center">
            No drawing yet
          </div>
        )}
        </div>
      </div>

       <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <CardOptionsMenu
            isFolder={isFolderCard}
            isRecycleBin={isRecycleBin}
            align="start"
            open={menuOpen}
            onOpenChange={(open) => {
              setMenuOpen(open);
              if (!open) setMenuAnchorPoint(null);
            }}
            anchorPoint={menuAnchorPoint}
            onOpen={onNavigate}
            onAddNote={onAddNote}
            onRename={handleRenameStart}
            onMove={onMoveStart}
            onMoveUp={onReorder ? () => onReorder('up') : undefined}
            onMoveDown={onReorder ? () => onReorder('down') : undefined}
            onChangeType={onOpenTypePicker}
            onRestore={onRestore}
            onDelete={onDelete}
          />
       </div>
    </div>
  );
}

interface RecycleBinTreeItemProps {
  card: Card;
  depth: number;
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
}

function RecycleBinTreeItem({ card, depth, onRestore, onDeleteForever }: RecycleBinTreeItemProps) {
  const deletedChildren = card.children
    .filter(c => c.isDeleted)
    .sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));
  const hasChildren = deletedChildren.length > 0;

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md border bg-card p-3"
        style={{ marginLeft: `${depth * 20}px` }}
      >
        {hasChildren ? <Folder className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{card.title || 'Untitled'}</div>
          <div className="text-xs text-muted-foreground">
            Deleted {formatDistanceToNow(new Date(card.updatedAt), { addSuffix: true })}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRestore(card.id)}>
              <ArrowUp className="w-4 h-4 mr-2" />
              Restore
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDeleteForever(card.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Forever
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {deletedChildren.length > 0 && (
        <div className="mt-2 space-y-2">
          {deletedChildren.map(child => (
            <RecycleBinTreeItem
              key={child.id}
              card={child}
              depth={depth + 1}
              onRestore={onRestore}
              onDeleteForever={onDeleteForever}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkspacePanel({
  currentCard,
  childrenCards,
  allCards,
  isRecycleBin,
  onNavigateCard,
  onAddCard,
  onUpdateCard,
  onUpdateCardBlocks,
  onMoveCard,
  onDeleteCard,
  onRestoreCard,
  onPermanentlyDeleteCard,
  onEmptyRecycleBin,
  onReorderCard,
  onReorderCardsByIndex,
  onSearch,
  searchQuery,
  sidebarOpen = true
}: WorkspacePanelProps) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [cardToMove, setCardToMove] = useState<string | null>(null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeDialogMode, setTypeDialogMode] = useState<'create' | 'change'>('create');
  const [typeDialogParentId, setTypeDialogParentId] = useState<string | null>(null);
  const [typeDialogCard, setTypeDialogCard] = useState<Card | null>(null);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [overChildId, setOverChildId] = useState<string | null>(null);

  const handleMoveStart = (id: string) => {
    setCardToMove(id);
    setMoveDialogOpen(true);
  };

  const handleMoveSelect = (targetId: string | null) => {
    if (cardToMove) {
      onMoveCard(cardToMove, targetId);
    }
    setMoveDialogOpen(false);
    setCardToMove(null);
  };

  const moveExcludeIds = cardToMove
    ? [cardToMove, ...getDescendantIds(allCards, cardToMove)]
    : [];

  // Auto resize title
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };
  
  useEffect(() => {
    if (titleRef.current) autoResize(titleRef.current);
  }, [currentCard?.title]);

  // Block Dnd
  const blockSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleBlockDragEnd = (event: DragEndEvent) => {
    if (!currentCard) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = currentCard.blocks.findIndex(b => b.id === active.id);
      const newIndex = currentCard.blocks.findIndex(b => b.id === over.id);
      const newBlocks = arrayMove(currentCard.blocks, oldIndex, newIndex);
      onUpdateCardBlocks(currentCard.id, newBlocks);
    }
  };

  // Card Children Dnd
  const childSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleChildDragStart = (event: DragStartEvent) => {
    setActiveChildId(String(event.active.id));
    setOverChildId(null);
  };

  const handleChildDragOver = (event: DragOverEvent) => {
    setOverChildId(event.over ? String(event.over.id) : null);
  };

  const handleChildDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveChildId(null);
    setOverChildId(null);
    if (over && active.id !== over.id) {
       // Reorder children
       const oldIndex = childrenCards.findIndex(c => c.id === active.id);
       const newIndex = childrenCards.findIndex(c => c.id === over.id);
       const newOrder = arrayMove(childrenCards, oldIndex, newIndex);
       const ids = newOrder.map(c => c.id);
       onReorderCardsByIndex(ids);
    }
  };

  const handleChildDragCancel = () => {
    setActiveChildId(null);
    setOverChildId(null);
  };

  const getChildDropIndicator = (cardId: string): 'before' | 'after' | null => {
    if (!activeChildId || !overChildId || cardId !== overChildId || activeChildId === overChildId) {
      return null;
    }
    const activeIndex = childrenCards.findIndex(card => card.id === activeChildId);
    const overIndex = childrenCards.findIndex(card => card.id === overChildId);
    if (activeIndex === -1 || overIndex === -1) return null;
    return activeIndex < overIndex ? 'after' : 'before';
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentCard) return;
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      
      // Replace existing image if strictly one per card desired, or append?
      // Let's replace existing image to keep it cleaner, but NOT remove other types.
      const blocksWithoutImage = currentCard.blocks.filter(b => b.type !== 'image');
      
      // @ts-ignore
      const newBlock: ImageBlock = { id: generateId(), type: 'image', dataUrl, width: 100 };
      onUpdateCardBlocks(currentCard.id, [...blocksWithoutImage, newBlock]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  
  const applyCardType = (card: Card, nextType: CardType) => {
    const hasTypeBlock = card.blocks.some((block) => {
      if (nextType === 'note') return block.type === 'text' || block.type === 'bullets';
      return block.type === nextType;
    });
    if (hasTypeBlock || nextType === 'folder' || nextType === 'image') return;

    if (nextType === 'note') {
      const newBlock: ContentBlock = { id: generateId(), type: 'text', content: '' };
      onUpdateCardBlocks(card.id, [...card.blocks, newBlock]);
      return;
    }
    if (nextType === 'checkbox') {
      const newBlock: CheckboxBlock = { id: generateId(), type: 'checkbox', checked: false };
      onUpdateCardBlocks(card.id, [...card.blocks, newBlock]);
      return;
    }
    if (nextType === 'link') {
      const newBlock: LinkBlock = { id: generateId(), type: 'link', url: '' };
      onUpdateCardBlocks(card.id, [...card.blocks, newBlock]);
      return;
    }
    if (nextType === 'drawing') {
      const newBlock: DrawingBlock = {
        id: generateId(),
        type: 'drawing',
        strokes: [],
        groups: [],
        redoStrokes: [],
        previewDataUrl: createDrawingPreviewDataUrl([]),
        historyPast: [],
        historyFuture: [],
      };
      onUpdateCardBlocks(card.id, [...card.blocks, newBlock]);
    }
  };

  const handleChangeCardType = (card: Card, nextType: CardType) => {
    if (card.cardType === nextType) return;
    onUpdateCard(card.id, { cardType: nextType });
    applyCardType(card, nextType);
  };

  const createCardByType = (parentId: string | null, type: CardType) => {
    if (type === 'image') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const id = onAddCard(parentId, 'image');
          const block: ImageBlock = { id: generateId(), type: 'image', dataUrl, width: 100 };
          onUpdateCardBlocks(id, [block]);
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }

    const id = onAddCard(parentId, type);
    if (type === 'checkbox') {
      const block: CheckboxBlock = { id: generateId(), type: 'checkbox', checked: false };
      onUpdateCardBlocks(id, [block]);
      return;
    }
    if (type === 'link') {
      const block: LinkBlock = { id: generateId(), type: 'link', url: '' };
      onUpdateCardBlocks(id, [block]);
      return;
    }
    if (type === 'drawing') {
      const block: DrawingBlock = {
        id: generateId(),
        type: 'drawing',
        strokes: [],
        groups: [],
        redoStrokes: [],
        previewDataUrl: createDrawingPreviewDataUrl([]),
        historyPast: [],
        historyFuture: [],
      };
      onUpdateCardBlocks(id, [block]);
      onNavigateCard(id);
      return;
    }
  };

  const openCreateTypePicker = (parentId: string | null) => {
    setTypeDialogMode('create');
    setTypeDialogParentId(parentId);
    setTypeDialogCard(null);
    setTypeDialogOpen(true);
  };

  const openChangeTypePicker = (card: Card) => {
    setTypeDialogMode('change');
    setTypeDialogCard(card);
    setTypeDialogParentId(null);
    setTypeDialogOpen(true);
  };

  const handleTypeSelect = (type: CardType) => {
    if (typeDialogMode === 'create') {
      createCardByType(typeDialogParentId, type);
    } else if (typeDialogCard) {
      handleChangeCardType(typeDialogCard, type);
    }
    setTypeDialogOpen(false);
  };

  const visibleBlocks = currentCard ? getVisibleBlocksByCardType(currentCard) : [];

  const updateBlock = (index: number, block: ContentBlock) => {
    if (!currentCard) return;
    const newBlocks = [...currentCard.blocks];
    newBlocks[index] = block;
    onUpdateCardBlocks(currentCard.id, newBlocks);
  };

  const deleteBlock = (index: number) => {
    if (!currentCard) return;
    const newBlocks = currentCard.blocks.filter((_, i) => i !== index);
    onUpdateCardBlocks(currentCard.id, newBlocks);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (!currentCard) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= visibleBlocks.length) return;
    const source = visibleBlocks[index];
    const target = visibleBlocks[newIndex];
    if (!source || !target) return;
    const sourceIdx = currentCard.blocks.findIndex(b => b.id === source.id);
    const targetIdx = currentCard.blocks.findIndex(b => b.id === target.id);
    if (sourceIdx === -1 || targetIdx === -1) return;
    const newBlocks = arrayMove(currentCard.blocks, sourceIdx, targetIdx);
    onUpdateCardBlocks(currentCard.id, newBlocks);
  };

  const handleEmptyRecycleBin = () => {
    if (window.confirm('Permanently delete all items in Recycle Bin?')) {
      onEmptyRecycleBin();
    }
  };

  const canShowChildrenUI = isRecycleBin || !currentCard || currentCard.cardType === 'folder';

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-2 pl-12">
         <div className="flex-1 flex items-center gap-2 min-w-0">
           {currentCard ? (
             <>
               <h2 className="text-lg font-semibold break-words whitespace-normal">{currentCard.title || "Untitled"}</h2>
               <Button variant="ghost" size="icon" onClick={() => onNavigateCard(currentCard.parentId)} className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground">
                 <ArrowUp className="w-4 h-4" />
               </Button>
             </>
           ) : (
             <h2 className="text-lg font-semibold">{isRecycleBin ? "Recycle Bin" : "Home"}</h2>
           )}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-8">
        {/* Current Card Content (Blocks) */}
        {currentCard && !isRecycleBin && !searchQuery && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-start gap-3">
              <CardTypeIcon cardType={currentCard.cardType} className="mt-2" />
              <Textarea
                ref={titleRef}
                value={currentCard.title}
                onChange={(e) => onUpdateCard(currentCard.id, { title: e.target.value })}
                onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                placeholder="Untitled"
                className="text-3xl font-bold border-none shadow-none focus-visible:ring-0 p-0 resize-none min-h-[44px] overflow-hidden placeholder:text-muted-foreground/50 bg-transparent mb-4"
                rows={1}
              />
            </div>

            {currentCard.cardType === 'image' && visibleBlocks.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4">
                <Button size="sm" onClick={() => imageInputRef.current?.click()}>
                  <Image className="w-4 h-4 mr-1" />
                  Upload Image
                </Button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <DndContext
                sensors={blockSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleBlockDragEnd}
              >
                <SortableContext
                  items={visibleBlocks.map(b => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {visibleBlocks.map((block, index) => {
                      const blockIndex = currentCard.blocks.findIndex(b => b.id === block.id);
                      return (
                        <SortableBlock
                          key={block.id}
                          id={block.id}
                          block={block}
                          isRecycleBin={isRecycleBin}
                          isSelected={true}
                          onUpdate={(b) => updateBlock(blockIndex, b)}
                          onDelete={() => deleteBlock(blockIndex)}
                          onMoveUp={() => moveBlock(index, 'up')}
                          onMoveDown={() => moveBlock(index, 'down')}
                          canMoveUp={index > 0}
                          canMoveDown={index < visibleBlocks.length - 1}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}

        {/* Children Cards Grid */}
        {canShowChildrenUI && (
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {currentCard ? "Sub-notes" : "Notes"}
            </h3>

            {isRecycleBin ? (
              <Button variant="destructive" size="sm" onClick={handleEmptyRecycleBin}>
                <Trash2 className="w-4 h-4 mr-1" />
                Empty Recycle Bin
              </Button>
            ) : (
              <Button size="sm" onClick={() => openCreateTypePicker(currentCard?.id || null)}>
                <Plus className="w-4 h-4 mr-1" />
                New Note
              </Button>
            )}
          </div>

          {childrenCards.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground italic border-2 border-dashed rounded-lg">
               {isRecycleBin ? "Recycle Bin is empty." : "No notes here yet. Create one!"}
             </div>
          ) : isRecycleBin ? (
            <div className="space-y-2">
              {childrenCards
                .filter(c => c.isDeleted)
                .sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0))
                .map(card => (
                  <RecycleBinTreeItem
                    key={card.id}
                    card={card}
                    depth={0}
                    onRestore={(id) => onRestoreCard(id, null)}
                    onDeleteForever={onPermanentlyDeleteCard}
                  />
                ))}
            </div>
          ) : (
            <DndContext
              sensors={childSensors}
              collisionDetection={closestCenter}
              onDragStart={handleChildDragStart}
              onDragOver={handleChildDragOver}
              onDragEnd={handleChildDragEnd}
              onDragCancel={handleChildDragCancel}
            >
              <SortableContext
                items={childrenCards.map(c => c.id)}
                strategy={rectSortingStrategy}
              >
                <div className={cn(
                  "grid auto-rows-[4px] gap-2 transition-all",
                  sidebarOpen 
                    ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" 
                    : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                )}>
                  {childrenCards.map(card => (
                    <GridCardItem
                      key={card.id}
                      card={card}
                      onNavigate={() => onNavigateCard(card.id)}
                      onAddNote={() => openCreateTypePicker(card.id)}
                      onMoveStart={() => handleMoveStart(card.id)}
                      onRename={(title) => onUpdateCard(card.id, { title })}
                      onDelete={() => isRecycleBin ? onPermanentlyDeleteCard(card.id) : onDeleteCard(card.id)}
                      onUpdateBlocks={(blocks) => onUpdateCardBlocks(card.id, blocks)}
                      onOpenTypePicker={() => openChangeTypePicker(card)}
                      isRecycleBin={isRecycleBin}
                      onRestore={() => onRestoreCard(card.id, null)}
                      onReorder={(dir) => onReorderCard(card.id, dir)}
                      dropIndicator={getChildDropIndicator(card.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
        )}
      </div>

      <CategoryPickerDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        categories={allCards}
        onSelect={handleMoveSelect}
        title="Move to..."
        excludeIds={moveExcludeIds}
        showRoot={true}
      />

      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{typeDialogMode === 'create' ? 'Create Note Type' : 'Change Note Type'}</DialogTitle>
            <DialogDescription>
              {typeDialogMode === 'create'
                ? 'Choose the type for your new note.'
                : 'Choose a new type for this note. Existing data is kept.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {CARD_TYPE_ORDER.map((type) => (
              <Button
                key={type}
                type="button"
                variant="outline"
                disabled={typeDialogMode === 'change' && typeDialogCard?.cardType === type}
                className="justify-start"
                onClick={() => handleTypeSelect(type)}
              >
                <CardTypeIcon cardType={type} className="w-4 h-4" />
                <span className="ml-2">{CARD_TYPE_LABELS[type]}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
