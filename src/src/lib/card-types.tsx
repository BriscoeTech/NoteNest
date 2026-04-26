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
import type {
  Card,
  CardType,
  CheckboxBlock,
  ContentBlock,
  DrawingBlock,
  GraphBlock,
  ImageBlock,
  LinkBlock,
} from '@/lib/types';
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
  usesCreateFilePicker: boolean;
  needsDrawingPreviewContext: boolean;
  showsEmptyImageUpload: boolean;
  emptyGridMessage: string | null;
  getVisibleBlocks(card: Pick<Card, 'blocks'>): ContentBlock[];
  getTypedBlocks(card: Pick<Card, 'blocks'>): CardTypedBlocks;
  createBlocksForNewCard(context?: CardBlockCreationContext): ContentBlock[];
  ensureBlocksForTypeChange(card: Pick<Card, 'blocks'>, context?: CardBlockCreationContext): ContentBlock[];
  inferFromCard(card: Pick<Card, 'blocks' | 'children'>): boolean;
  getGridLayout(context: CardGridLayoutContext): CardGridLayout;
  renderTreeIcon(isExpanded: boolean): ReactNode;
}

export interface CardGridLayoutContext {
  hasCheckboxBlock: boolean;
  inlineChildren: boolean;
  isRecycleBin: boolean;
  visibleChildrenCount: number;
  nestingDepth: number;
}

export interface CardGridLayout {
  isMediaCard: boolean;
  canHaveChildren: boolean;
  showInlineChildren: boolean;
  shouldSpanWide: boolean;
  shouldSpanExtraWide: boolean;
  contentClassName: string;
  titleWrapperClassName: string;
  titleClassName: string;
  emptyMessage: string | null;
}

export interface CardTypedBlocks {
  checkboxBlock?: CheckboxBlock;
  linkBlock?: LinkBlock;
  imageBlock?: ImageBlock;
  drawingBlock?: DrawingBlock;
  graphBlock?: GraphBlock;
}

export abstract class Cardbase implements CardTypeDefinition {
  readonly canHaveChildren: boolean = false;
  readonly opensOnCreate: boolean = false;
  readonly isMediaCard: boolean = false;
  readonly showTreeIcon: boolean = true;
  readonly usesCreateFilePicker: boolean = false;
  readonly needsDrawingPreviewContext: boolean = false;
  readonly showsEmptyImageUpload: boolean = false;
  readonly emptyGridMessage: string | null = null;

  protected constructor(
    readonly type: CardType,
    readonly label: string,
    readonly Icon: LucideIcon,
    private readonly visibleBlockTypes: ContentBlock['type'][]
  ) {}

  getVisibleBlocks(card: Pick<Card, 'blocks'>): ContentBlock[] {
    return card.blocks.filter((block) => this.visibleBlockTypes.includes(block.type));
  }

  getTypedBlocks(_card: Pick<Card, 'blocks'>): CardTypedBlocks {
    return {};
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

  getGridLayout({
    hasCheckboxBlock,
    inlineChildren,
    isRecycleBin,
    visibleChildrenCount,
    nestingDepth,
  }: CardGridLayoutContext): CardGridLayout {
    const showInlineChildren = inlineChildren && this.canHaveChildren && !isRecycleBin;
    return {
      isMediaCard: this.isMediaCard,
      canHaveChildren: this.canHaveChildren,
      showInlineChildren,
      shouldSpanWide: showInlineChildren && visibleChildrenCount > 0,
      shouldSpanExtraWide: showInlineChildren && nestingDepth === 0 && visibleChildrenCount >= 10,
      contentClassName: cn(
        'relative rounded-lg border bg-card hover:bg-accent hover:border-primary/30 transition-colors min-h-[96px]',
        showInlineChildren
          ? 'p-4'
          : cn(
              'flex items-center gap-2 justify-center',
              this.isMediaCard ? 'p-0 overflow-hidden' : 'p-4',
              hasCheckboxBlock ? 'justify-start pl-4' : 'justify-center'
            ),
        this.canHaveChildren && 'bg-card border-border hover:bg-accent'
      ),
      titleWrapperClassName: cn('w-full min-w-0', showInlineChildren && hasCheckboxBlock && 'flex items-start gap-2'),
      titleClassName: cn(
        'text-sm font-medium w-full min-w-0 px-2 border-none shadow-none bg-transparent p-0 min-h-[20px] break-words whitespace-pre-wrap outline-none',
        'cursor-text select-text',
        hasCheckboxBlock ? 'text-left' : 'text-center'
      ),
      emptyMessage: this.emptyGridMessage,
    };
  }

  renderTreeIcon(_isExpanded: boolean): ReactNode {
    if (!this.showTreeIcon) return null;
    const Icon = this.Icon;
    return <Icon className="w-4 h-4 text-muted-foreground shrink-0" />;
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
  readonly showTreeIcon = false;

  constructor() {
    super('checkbox', 'Checkbox', CheckSquare, ['checkbox']);
  }

  getTypedBlocks(card: Pick<Card, 'blocks'>): CardTypedBlocks {
    return { checkboxBlock: this.getVisibleBlocks(card)[0] as CheckboxBlock | undefined };
  }

  createBlocksForNewCard(): ContentBlock[] {
    return [{ id: generateId(), type: 'checkbox', checked: false }];
  }
}

class LinkCard extends Cardbase {
  constructor() {
    super('link', 'Link', LinkIcon, ['link']);
  }

  getTypedBlocks(card: Pick<Card, 'blocks'>): CardTypedBlocks {
    return { linkBlock: this.getVisibleBlocks(card)[0] as LinkBlock | undefined };
  }

  createBlocksForNewCard(): ContentBlock[] {
    return [{ id: generateId(), type: 'link', url: '' }];
  }
}

class ImageCard extends Cardbase {
  readonly isMediaCard = true;
  readonly usesCreateFilePicker = true;
  readonly showsEmptyImageUpload = true;
  readonly emptyGridMessage = 'No image yet';

  constructor() {
    super('image', 'Image', Image, ['image']);
  }

  getTypedBlocks(card: Pick<Card, 'blocks'>): CardTypedBlocks {
    return { imageBlock: this.getVisibleBlocks(card)[0] as ImageBlock | undefined };
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
  readonly needsDrawingPreviewContext = true;
  readonly emptyGridMessage = 'No drawing yet';

  constructor() {
    super('drawing', 'Drawing', Brush, ['drawing']);
  }

  getTypedBlocks(card: Pick<Card, 'blocks'>): CardTypedBlocks {
    return { drawingBlock: this.getVisibleBlocks(card)[0] as DrawingBlock | undefined };
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
  readonly emptyGridMessage = 'No graph yet';

  constructor() {
    super('graph', 'Graph', LayoutGrid, ['graph']);
  }

  getTypedBlocks(card: Pick<Card, 'blocks'>): CardTypedBlocks {
    return { graphBlock: this.getVisibleBlocks(card)[0] as GraphBlock | undefined };
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

  renderTreeIcon(isExpanded: boolean): ReactNode {
    const Icon = isExpanded ? FolderOpen : Folder;
    return <Icon className="w-4 h-4 text-muted-foreground shrink-0" />;
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

export function getTypedBlocksByCardType(card: Pick<Card, 'cardType' | 'blocks'>): CardTypedBlocks {
  return getCardTypeDefinition(card.cardType).getTypedBlocks(card);
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

export function cardTypeUsesCreateFilePicker(type: CardType): boolean {
  return getCardTypeDefinition(type).usesCreateFilePicker;
}

export function cardTypeOpensOnCreate(type: CardType): boolean {
  return getCardTypeDefinition(type).opensOnCreate;
}

export function createCardBlockContext(
  type: CardType,
  createDrawingPreviewDataUrl: () => string
): CardBlockCreationContext | undefined {
  return getCardTypeDefinition(type).needsDrawingPreviewContext
    ? { drawingPreviewDataUrl: createDrawingPreviewDataUrl() }
    : undefined;
}

export function CardTypeIcon({ cardType, className }: { cardType: CardType; className?: string }) {
  const Icon = getCardTypeDefinition(cardType).Icon;
  return <Icon className={cn('w-5 h-5 text-muted-foreground shrink-0', className)} />;
}

export function getTreeCardTypeIcon(cardType: CardType, isExpanded: boolean): ReactNode {
  return getCardTypeDefinition(cardType).renderTreeIcon(isExpanded);
}
