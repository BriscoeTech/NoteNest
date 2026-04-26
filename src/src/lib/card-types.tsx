import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Brush,
  CheckSquare,
  FileText,
  Folder,
  FolderOpen,
  Image,
  LayoutGrid,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Card, CardType, ContentBlock, GraphBlock } from '@/lib/types';
import { createGraphCells, generateId, GRAPH_MIN_SIZE } from '@/lib/types';

export interface CardBlockCreationContext {
  imageDataUrl?: string;
  drawingPreviewDataUrl?: string;
}

export interface CardTypeDefinition {
  type: CardType;
  label: string;
  Icon: LucideIcon;
  canHaveChildren: boolean;
  opensOnCreate: boolean;
  isMediaCard: boolean;
  showTreeIcon: boolean;
  getVisibleBlocks(card: Pick<Card, 'blocks'>): ContentBlock[];
  createBlocksForNewCard(context?: CardBlockCreationContext): ContentBlock[];
  ensureBlocksForTypeChange(card: Pick<Card, 'blocks'>, context?: CardBlockCreationContext): ContentBlock[];
  inferFromCard(card: Pick<Card, 'blocks' | 'children'>): boolean;
}

export abstract class Cardbase implements CardTypeDefinition {
  readonly canHaveChildren: boolean = false;
  readonly opensOnCreate: boolean = false;
  readonly isMediaCard: boolean = false;
  readonly showTreeIcon: boolean = true;

  protected constructor(
    readonly type: CardType,
    readonly label: string,
    readonly Icon: LucideIcon,
    private readonly visibleBlockTypes: ContentBlock['type'][]
  ) {}

  getVisibleBlocks(card: Pick<Card, 'blocks'>): ContentBlock[] {
    return card.blocks.filter((block) => this.visibleBlockTypes.includes(block.type));
  }

  createBlocksForNewCard(_context: CardBlockCreationContext = {}): ContentBlock[] {
    return [];
  }

  createBlocksForTypeChange(context: CardBlockCreationContext = {}): ContentBlock[] {
    return this.createBlocksForNewCard(context);
  }

  ensureBlocksForTypeChange(card: Pick<Card, 'blocks'>, context: CardBlockCreationContext = {}): ContentBlock[] {
    if (this.getVisibleBlocks(card).length > 0) return card.blocks;
    const blocks = this.createBlocksForTypeChange(context);
    return blocks.length > 0 ? [...card.blocks, ...blocks] : card.blocks;
  }

  inferFromCard(card: Pick<Card, 'blocks' | 'children'>): boolean {
    return this.getVisibleBlocks(card).length > 0;
  }
}

class NoteCard extends Cardbase {
  constructor() {
    super('note', 'Note', FileText, ['text', 'bullets']);
  }

  createBlocksForTypeChange(): ContentBlock[] {
    return [{ id: generateId(), type: 'text', content: '' }];
  }
}

class CheckboxCard extends Cardbase {
  constructor() {
    super('checkbox', 'Checkbox', CheckSquare, ['checkbox']);
  }

  createBlocksForNewCard(): ContentBlock[] {
    return [{ id: generateId(), type: 'checkbox', checked: false }];
  }
}

class LinkCard extends Cardbase {
  constructor() {
    super('link', 'Link', LinkIcon, ['link']);
  }

  createBlocksForNewCard(): ContentBlock[] {
    return [{ id: generateId(), type: 'link', url: '' }];
  }
}

class ImageCard extends Cardbase {
  readonly isMediaCard = true;

  constructor() {
    super('image', 'Image', Image, ['image']);
  }

  createBlocksForNewCard(context: CardBlockCreationContext = {}): ContentBlock[] {
    return context.imageDataUrl
      ? [{ id: generateId(), type: 'image', dataUrl: context.imageDataUrl, width: 100 }]
      : [];
  }

  createBlocksForTypeChange(): ContentBlock[] {
    return [];
  }
}

class DrawingCard extends Cardbase {
  readonly isMediaCard = true;
  readonly opensOnCreate = true;

  constructor() {
    super('drawing', 'Drawing', Brush, ['drawing']);
  }

  createBlocksForNewCard(context: CardBlockCreationContext = {}): ContentBlock[] {
    return [{
      id: generateId(),
      type: 'drawing',
      strokes: [],
      groups: [],
      redoStrokes: [],
      previewDataUrl: context.drawingPreviewDataUrl ?? '',
      historyPast: [],
      historyFuture: [],
    }];
  }
}

export function createEmptyGraphBlock(): GraphBlock {
  return {
    id: generateId(),
    type: 'graph',
    rows: GRAPH_MIN_SIZE,
    columns: GRAPH_MIN_SIZE,
    cells: createGraphCells(GRAPH_MIN_SIZE, GRAPH_MIN_SIZE),
  };
}

class GraphCard extends Cardbase {
  readonly opensOnCreate = true;

  constructor() {
    super('graph', 'Graph', LayoutGrid, ['graph']);
  }

  createBlocksForNewCard(): ContentBlock[] {
    return [createEmptyGraphBlock()];
  }
}

class FolderCard extends Cardbase {
  readonly canHaveChildren = true;

  constructor() {
    super('folder', 'Folder', Folder, []);
  }

  inferFromCard(card: Pick<Card, 'blocks' | 'children'>): boolean {
    return card.children.length > 0;
  }
}

export const CARD_TYPES = [
  new NoteCard(),
  new CheckboxCard(),
  new LinkCard(),
  new ImageCard(),
  new DrawingCard(),
  new GraphCard(),
  new FolderCard(),
] as const satisfies readonly CardTypeDefinition[];

export const CARD_TYPE_ORDER = CARD_TYPES.map((definition) => definition.type);

export const CARD_TYPE_LABELS = Object.fromEntries(
  CARD_TYPES.map((definition) => [definition.type, definition.label])
) as Record<CardType, string>;

export const CARD_TYPE_REGISTRY = Object.fromEntries(
  CARD_TYPES.map((definition) => [definition.type, definition])
) as unknown as Record<CardType, CardTypeDefinition>;

const LEGACY_INFERENCE_ORDER: CardType[] = ['folder', 'checkbox', 'link', 'image', 'drawing', 'graph', 'note'];

export function getCardTypeDefinition(type: CardType): CardTypeDefinition {
  return CARD_TYPE_REGISTRY[type];
}

export function inferCardTypeFromCardData(
  card: Pick<Card, 'blocks' | 'children'> & Partial<Pick<Card, 'cardType'>>
): CardType {
  if (card.cardType) return card.cardType;
  return LEGACY_INFERENCE_ORDER.find((type) => getCardTypeDefinition(type).inferFromCard(card)) ?? 'note';
}

export function getVisibleBlocksByCardType(card: Pick<Card, 'cardType' | 'blocks'>): ContentBlock[] {
  return getCardTypeDefinition(card.cardType).getVisibleBlocks(card);
}

export function createInitialBlocksForCardType(
  type: CardType,
  context: CardBlockCreationContext = {}
): ContentBlock[] {
  return getCardTypeDefinition(type).createBlocksForNewCard(context);
}

export function ensureCardBlocksForTypeChange(
  card: Pick<Card, 'blocks'>,
  type: CardType,
  context: CardBlockCreationContext = {}
): ContentBlock[] {
  return getCardTypeDefinition(type).ensureBlocksForTypeChange(card, context);
}

export function cardTypeCanHaveChildren(type: CardType): boolean {
  return getCardTypeDefinition(type).canHaveChildren;
}

export function cardTypeIsMedia(type: CardType): boolean {
  return getCardTypeDefinition(type).isMediaCard;
}

export function CardTypeIcon({ cardType, className }: { cardType: CardType; className?: string }) {
  const Icon = getCardTypeDefinition(cardType).Icon;
  return <Icon className={cn('w-5 h-5 text-muted-foreground shrink-0', className)} />;
}

export function getTreeCardTypeIcon(cardType: CardType, isExpanded: boolean): ReactNode {
  if (cardType === 'checkbox') return null;
  const Icon = cardType === 'folder' && isExpanded ? FolderOpen : getCardTypeDefinition(cardType).Icon;
  return <Icon className="w-4 h-4 text-muted-foreground shrink-0" />;
}
