import type {
  BulletBlock,
  CheckboxBlock,
  ContentBlock,
  DrawingBlock,
  GraphBlock,
  ImageBlock,
  LinkBlock,
  TextBlock,
} from '@/lib/types';
import { normalizeGraphBlock } from '@/lib/types';

export abstract class Blockbase<TBlock extends ContentBlock = ContentBlock> {
  protected constructor(readonly type: TBlock['type']) {}

  normalize(block: TBlock): TBlock {
    return block;
  }

  matchesSearch(_block: TBlock, _lowerQuery: string): boolean {
    return false;
  }
}

class TextBlockDefinition extends Blockbase<TextBlock> {
  constructor() {
    super('text');
  }

  matchesSearch(block: TextBlock, lowerQuery: string): boolean {
    return block.content.toLowerCase().includes(lowerQuery);
  }
}

class BulletBlockDefinition extends Blockbase<BulletBlock> {
  constructor() {
    super('bullets');
  }

  matchesSearch(block: BulletBlock, lowerQuery: string): boolean {
    return block.items.some((item) => item.content.toLowerCase().includes(lowerQuery));
  }
}

class ImageBlockDefinition extends Blockbase<ImageBlock> {
  constructor() {
    super('image');
  }
}

class CheckboxBlockDefinition extends Blockbase<CheckboxBlock> {
  constructor() {
    super('checkbox');
  }
}

class LinkBlockDefinition extends Blockbase<LinkBlock> {
  constructor() {
    super('link');
  }
}

class DrawingBlockDefinition extends Blockbase<DrawingBlock> {
  constructor() {
    super('drawing');
  }
}

class GraphBlockDefinition extends Blockbase<GraphBlock> {
  constructor() {
    super('graph');
  }

  normalize(block: GraphBlock): GraphBlock {
    return normalizeGraphBlock(block);
  }

  matchesSearch(block: GraphBlock, lowerQuery: string): boolean {
    return block.cells.some((cell) => cell.text.toLowerCase().includes(lowerQuery));
  }
}

export const BLOCK_TYPES = [
  new TextBlockDefinition(),
  new BulletBlockDefinition(),
  new ImageBlockDefinition(),
  new CheckboxBlockDefinition(),
  new LinkBlockDefinition(),
  new DrawingBlockDefinition(),
  new GraphBlockDefinition(),
] as const satisfies readonly Blockbase[];

export const BLOCK_TYPE_REGISTRY = Object.fromEntries(
  BLOCK_TYPES.map((definition) => [definition.type, definition])
) as Record<ContentBlock['type'], Blockbase>;

export function getBlockDefinition(type: ContentBlock['type']): Blockbase {
  return BLOCK_TYPE_REGISTRY[type];
}

export function normalizeContentBlock(block: ContentBlock): ContentBlock {
  return getBlockDefinition(block.type).normalize(block);
}

export function blockMatchesSearch(block: ContentBlock, lowerQuery: string): boolean {
  return getBlockDefinition(block.type).matchesSearch(block, lowerQuery);
}
