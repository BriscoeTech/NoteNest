import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Search, X, Folder, FolderOpen, ChevronDown, Trash2, FolderInput, MoreVertical, Type, List, ChevronUp, AlertCircle, Image, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, Category, BulletItem, ContentBlock, TextBlock, BulletBlock, ImageBlock } from '@/lib/types';
import { RECYCLE_BIN_ID, generateId, findCategoryById } from '@/lib/types';
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CategoryPickerDialog } from './CategoryPickerDialog';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface WorkspacePanelProps {
  cards: Card[];
  allCards: Card[];
  categoryId: string | null;
  categoryName: string;
  isRecycleBin: boolean;
  hasCategories: boolean;
  categories: Category[];
  currentCategory: Category | null;
  selectedCardId: string | null;
  onSelectCategory: (id: string) => void;
  onSelectCard: (cardId: string | null) => void;
  onAddCard: () => string | undefined;
  onAddCategory: (name: string, parentId: string | null) => void;
  onUpdateCard: (id: string, updates: Partial<Card>) => void;
  onUpdateCardBlocks: (id: string, blocks: ContentBlock[]) => void;
  onMoveCard: (cardId: string, categoryId: string) => void;
  onDeleteCard: (id: string) => void;
  onRestoreCard: (id: string, categoryId: string) => void;
  onPermanentlyDeleteCard: (id: string) => void;
  onReorderCard: (cardId: string, direction: 'up' | 'down') => void;
  onReorderCardsByIndex: (cardIds: string[]) => void;
  onReorderSubcategories: (parentId: string | null, orderedIds: string[]) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

interface BlockEditorProps {
  block: ContentBlock;
  isRecycleBin: boolean;
  isSelected: boolean;
  onUpdate: (block: ContentBlock) => void;
  onDelete: () => void;
  dragHandleProps?: {
    attributes: Record<string, any>;
    listeners: Record<string, any>;
  };
}

function BlockEditor({ block, isRecycleBin, isSelected, onUpdate, onDelete, dragHandleProps }: BlockEditorProps) {
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

  if (block.type === 'text') {
    return (
      <div className="group relative flex items-start gap-1">
        {isSelected && dragHandleProps && (
          <div 
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/40 hover:text-muted-foreground mt-1"
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
            className="w-full border-none shadow-none focus-visible:ring-0 p-2 resize-none min-h-0 overflow-hidden text-sm bg-muted/30 rounded placeholder:text-muted-foreground/40"
            rows={1}
          />
        </div>
        {isSelected && (
          <button onClick={onDelete} className="p-1 text-muted-foreground/40 hover:text-destructive mt-1">
            <Trash2 className="w-3 h-3" />
          </button>
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
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/40 hover:text-muted-foreground mt-1"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical className="w-3 h-3" />
          </div>
        )}
        <div className="flex-1">
          {isSelected && (
            <div className="mb-2 flex items-center gap-2 bg-muted/30 rounded p-2">
              <span className="text-xs text-muted-foreground">Size:</span>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={imageBlock.width}
                onChange={(e) => onUpdate({ ...imageBlock, width: parseInt(e.target.value) })}
                className="flex-1 h-1 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-8">{imageBlock.width}%</span>
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
        {isSelected && (
          <button onClick={onDelete} className="p-1 text-muted-foreground/40 hover:text-destructive mt-1">
            <Trash2 className="w-3 h-3" />
          </button>
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
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/40 hover:text-muted-foreground mt-1"
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}
      <div className="flex-1 bg-muted/30 rounded p-2">
        <div className="space-y-0.5">
          {bulletBlock.items.map((bullet, index) => (
            <div
              key={bullet.id}
              className="flex items-start gap-1 group/bullet"
              style={{ paddingLeft: `${bullet.indent * 14}px` }}
            >
              <span className="text-muted-foreground font-bold mt-0.5 select-none text-xs">•</span>
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
                className="flex-1 min-h-0 py-0 px-0.5 border-none shadow-none focus-visible:ring-0 resize-none text-xs bg-transparent placeholder:text-muted-foreground/30 overflow-hidden text-foreground"
                rows={1}
              />
              {isSelected && (
                <button
                  className="opacity-0 group-hover/bullet:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity"
                  onClick={() => removeBullet(bullet.id)}
                  disabled={isRecycleBin}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {isSelected && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground mt-1 flex items-center gap-1"
            onClick={() => addBullet(bulletBlock.items.length - 1, 0)}
            disabled={isRecycleBin}
          >
            <Plus className="w-3 h-3" /> bullet
          </button>
        )}
      </div>
      {isSelected && (
        <button onClick={onDelete} className="p-1 text-muted-foreground/40 hover:text-destructive mt-1">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

interface SortableBlockProps {
  id: string;
  block: ContentBlock;
  isRecycleBin: boolean;
  isSelected: boolean;
  onUpdate: (block: ContentBlock) => void;
  onDelete: () => void;
}

function SortableBlock({ id, block, isRecycleBin, isSelected, onUpdate, onDelete }: SortableBlockProps) {
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
      <BlockEditor
        block={block}
        isRecycleBin={isRecycleBin}
        isSelected={isSelected}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragHandleProps={{ attributes, listeners: listeners || {} }}
      />
    </div>
  );
}

interface InlineCardProps {
  card: Card;
  isRecycleBin: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateCard: (id: string, updates: Partial<Card>) => void;
  onUpdateBlocks: (blocks: ContentBlock[]) => void;
  onMoveCard: (cardId: string) => void;
  onDeleteCard: (id: string) => void;
  onRestoreCard: (cardId: string) => void;
  onPermanentlyDeleteCard: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  dragHandleProps?: {
    attributes: Record<string, any>;
    listeners: Record<string, any>;
  };
}

function InlineCard({
  card,
  isRecycleBin,
  isSelected,
  onSelect,
  onUpdateCard,
  onUpdateBlocks,
  onMoveCard,
  onDeleteCard,
  onRestoreCard,
  onPermanentlyDeleteCard,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  dragHandleProps
}: InlineCardProps) {
  const [title, setTitle] = useState(card.title);
  const [blocks, setBlocks] = useState<ContentBlock[]>(card.blocks);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(card.title);
    setBlocks(card.blocks);
  }, [card.id, card.title, card.blocks]);

  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    // Focus title if this is a newly created card (empty title)
    if (isSelected && !card.title && titleRef.current) {
      titleRef.current.focus();
    }
  }, [isSelected, card.title]);

  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  useEffect(() => {
    if (titleRef.current) autoResize(titleRef.current);
  }, [title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!isRecycleBin) {
      onUpdateCard(card.id, { title: newTitle });
    }
  };

  const updateBlock = (index: number, block: ContentBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = block;
    setBlocks(newBlocks);
    if (!isRecycleBin) {
      onUpdateBlocks(newBlocks);
    }
  };

  const deleteBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);
    if (!isRecycleBin) {
      onUpdateBlocks(newBlocks);
    }
  };

  const blockSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      const newBlocks = arrayMove(blocks, oldIndex, newIndex);
      setBlocks(newBlocks);
      if (!isRecycleBin) {
        onUpdateBlocks(newBlocks);
      }
    }
  };

  const addTextBlock = () => {
    const newBlock: TextBlock = { id: generateId(), type: 'text', content: '' };
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    if (!isRecycleBin) {
      onUpdateBlocks(newBlocks);
    }
  };

  const addBulletBlock = () => {
    const newBlock: BulletBlock = { id: generateId(), type: 'bullets', items: [{ id: generateId(), content: '', indent: 0 }] };
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    if (!isRecycleBin) {
      onUpdateBlocks(newBlocks);
    }
  };

  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newBlock: ImageBlock = { id: generateId(), type: 'image', dataUrl, width: 100 };
      const newBlocks = [...blocks, newBlock];
      setBlocks(newBlocks);
      if (!isRecycleBin) {
        onUpdateBlocks(newBlocks);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getBlockPreview = (): string => {
    if (blocks.length === 0) return 'Empty note';
    const firstBlock = blocks[0];
    if (firstBlock.type === 'text') {
      return firstBlock.content.slice(0, 60) || 'Empty text';
    }
    if (firstBlock.type === 'bullets') {
      return firstBlock.items.map(b => '• ' + b.content).join(' ').slice(0, 60) || 'Empty bullets';
    }
    return '[Image]';
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={cardRef}
          data-testid={`card-item-${card.id}`}
          onClick={onSelect}
          className={cn(
            "border rounded-lg bg-card p-4 transition-colors relative",
            isSelected ? "ring-2 ring-primary/40 border-primary/40" : "hover:border-primary/30"
          )}
        >
          {!isRecycleBin && isSelected && dragHandleProps && (
            <div 
              className="absolute -left-6 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 text-muted-foreground/50 hover:text-muted-foreground"
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 space-y-2 pr-6">
              <Textarea
                ref={titleRef}
                data-testid={`card-title-${card.id}`}
                value={title}
                onChange={handleTitleChange}
                onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                placeholder="Untitled"
                disabled={isRecycleBin}
                className="text-base font-semibold border-none shadow-none focus-visible:ring-0 p-0 resize-none min-h-0 overflow-hidden placeholder:text-muted-foreground/50 bg-transparent"
                rows={1}
              />

              {blocks.length > 0 ? (
                isSelected && !isRecycleBin ? (
                  <DndContext
                    sensors={blockSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleBlockDragEnd}
                  >
                    <SortableContext
                      items={blocks.map(b => b.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {blocks.map((block, index) => (
                          <SortableBlock
                            key={block.id}
                            id={block.id}
                            block={block}
                            isRecycleBin={isRecycleBin}
                            isSelected={isSelected}
                            onUpdate={(b) => updateBlock(index, b)}
                            onDelete={() => deleteBlock(index)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="space-y-2">
                    {blocks.map((block, index) => (
                      <BlockEditor
                        key={block.id}
                        block={block}
                        isRecycleBin={isRecycleBin}
                        isSelected={isSelected}
                        onUpdate={(b) => updateBlock(index, b)}
                        onDelete={() => deleteBlock(index)}
                      />
                    ))}
                  </div>
                )
              ) : (
                isSelected ? null : <p className="text-xs text-muted-foreground/60 italic">Empty note</p>
              )}

              {!isRecycleBin && isSelected && (
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                    onClick={(e) => { e.stopPropagation(); addTextBlock(); }}
                  >
                    <Type className="w-3 h-3" /> Add text
                  </button>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                    onClick={(e) => { e.stopPropagation(); addBulletBlock(); }}
                  >
                    <List className="w-3 h-3" /> Add bullets
                  </button>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                    onClick={(e) => { e.stopPropagation(); imageInputRef.current?.click(); }}
                  >
                    <Image className="w-3 h-3" /> Add image
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              )}

              <p className="text-xs text-muted-foreground/50 pt-1">
                {formatDistanceToNow(card.updatedAt, { addSuffix: true })}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid={`card-menu-${card.id}`}
                  className="p-1 text-muted-foreground hover:text-foreground shrink-0 absolute top-3 right-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {isRecycleBin ? (
                  <>
                    <DropdownMenuItem onClick={() => onRestoreCard(card.id)}>
                      Restore to...
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onPermanentlyDeleteCard(card.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Delete Permanently
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => onMoveCard(card.id)}>
                      <FolderInput className="w-3.5 h-3.5 mr-2" />
                      Move to...
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDeleteCard(card.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        {isRecycleBin ? (
          <>
            <ContextMenuItem onClick={() => onRestoreCard(card.id)}>
              Restore to...
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => onPermanentlyDeleteCard(card.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete Permanently
            </ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuItem onClick={() => onMoveCard(card.id)}>
              <FolderInput className="w-3.5 h-3.5 mr-2" />
              Move to...
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => onDeleteCard(card.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

interface SortableCardProps extends InlineCardProps {
  id: string;
}

function SortableCard({ id, ...props }: SortableCardProps) {
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
      <InlineCard {...props} dragHandleProps={{ attributes, listeners: listeners || {} }} />
    </div>
  );
}

interface SortableSubcategoryProps {
  subcategory: Category;
  allCards: Card[];
  onSelectCategory: (id: string) => void;
}

function SortableSubcategory({ subcategory, allCards, onSelectCategory }: SortableSubcategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subcategory.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const folderCount = subcategory.children.length;
  const cardCount = allCards.filter(c => c.categoryId === subcategory.id && !c.isDeleted).length;
  const parts = [];
  if (folderCount > 0) parts.push(`${folderCount} folder${folderCount !== 1 ? 's' : ''}`);
  if (cardCount > 0) parts.push(`${cardCount} note${cardCount !== 1 ? 's' : ''}`);

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`subcategory-${subcategory.id}`}
      className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/30 cursor-pointer transition-colors relative group"
      onClick={() => onSelectCategory(subcategory.id)}
    >
      <div 
        className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1 text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <FolderOpen className="w-10 h-10 text-primary/70" />
      <span className="text-sm font-medium text-center truncate w-full">{subcategory.name}</span>
      <span className="text-xs text-muted-foreground">
        {parts.join(', ')}
      </span>
    </div>
  );
}

export function WorkspacePanel({
  cards,
  allCards,
  categoryId,
  categoryName,
  isRecycleBin,
  hasCategories,
  categories,
  currentCategory,
  selectedCardId,
  onSelectCategory,
  onSelectCard,
  onAddCard,
  onAddCategory,
  onUpdateCard,
  onUpdateCardBlocks,
  onMoveCard,
  onDeleteCard,
  onRestoreCard,
  onPermanentlyDeleteCard,
  onReorderCard,
  onReorderCardsByIndex,
  onReorderSubcategories,
  onSearch,
  searchQuery
}: WorkspacePanelProps) {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [cardToMove, setCardToMove] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingAsTopLevel, setAddingAsTopLevel] = useState(false);
  const newCategoryInputRef = useRef<HTMLInputElement>(null);

  const subcategories = currentCategory?.children || [];

  // Get all descendant categories for search
  const getAllDescendantCategories = (cat: Category): Category[] => {
    const result: Category[] = [];
    const traverse = (c: Category) => {
      result.push(c);
      c.children.forEach(traverse);
    };
    cat.children.forEach(traverse);
    return result;
  };

  // Filter categories by search query (case insensitive)
  const matchingCategories = searchQuery && currentCategory
    ? getAllDescendantCategories(currentCategory).filter(cat => 
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  useEffect(() => {
    if (isAddingCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [isAddingCategory]);

  const handleMoveClick = (cardId: string) => {
    setCardToMove(cardId);
    setIsRestoring(false);
    setMoveDialogOpen(true);
  };

  const handleRestoreClick = (cardId: string) => {
    setCardToMove(cardId);
    setIsRestoring(true);
    setMoveDialogOpen(true);
  };

  const handleCategorySelect = (targetCategoryId: string | null) => {
    if (cardToMove && targetCategoryId) {
      if (isRestoring) {
        onRestoreCard(cardToMove, targetCategoryId);
      } else {
        onMoveCard(cardToMove, targetCategoryId);
      }
    }
    setMoveDialogOpen(false);
    setCardToMove(null);
  };

  const startAddCategory = (asTopLevel: boolean) => {
    setAddingAsTopLevel(asTopLevel);
    setIsAddingCategory(true);
    setNewCategoryName('');
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const parentId = addingAsTopLevel ? null : categoryId;
      onAddCategory(newCategoryName.trim(), parentId);
    }
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCategory();
    } else if (e.key === 'Escape') {
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  };

  const handleAddNote = () => {
    if (hasCategories && categoryId && categoryId !== RECYCLE_BIN_ID) {
      onAddCard();
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex(c => c.id === active.id);
      const newIndex = cards.findIndex(c => c.id === over.id);
      const newOrder = arrayMove(cards, oldIndex, newIndex);
      onReorderCardsByIndex(newOrder.map(c => c.id));
    }
  };

  const handleSubcategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = subcategories.findIndex(c => c.id === active.id);
      const newIndex = subcategories.findIndex(c => c.id === over.id);
      const newOrder = arrayMove(subcategories, oldIndex, newIndex);
      onReorderSubcategories(categoryId, newOrder.map(c => c.id));
    }
  };

  const isValidCategory = categoryId && categoryId !== RECYCLE_BIN_ID;
  const canCreateNote = hasCategories && isValidCategory;

  if (!categoryId) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center p-8">
        <div className="text-center max-w-md">
          <Folder className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {hasCategories ? 'Select a Category' : 'Create Your First Category'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {hasCategories 
              ? 'Choose a category from the sidebar to view and create notes.'
              : 'Notes must belong to a category. Create one to get started.'}
          </p>
          {!hasCategories && (
            isAddingCategory ? (
              <div className="flex gap-2 justify-center">
                <Input
                  ref={newCategoryInputRef}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onBlur={handleAddCategory}
                  onKeyDown={handleCategoryKeyDown}
                  placeholder="Category name..."
                  className="w-48"
                />
              </div>
            ) : (
              <Button onClick={() => startAddCategory(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Category
              </Button>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 pl-12 border-b border-border space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground truncate">{categoryName}</h2>
          {isValidCategory && (
            <div className="flex items-center gap-2 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-testid="button-add-category"
                    variant="outline"
                    size="sm"
                  >
                    <Folder className="w-4 h-4 mr-1" />
                    New Category
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => startAddCategory(false)}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Subcategory in "{categoryName}"
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => startAddCategory(true)}>
                    <Folder className="w-4 h-4 mr-2" />
                    Top-Level Category
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        data-testid="button-add-card"
                        size="sm"
                        onClick={handleAddNote}
                        disabled={!canCreateNote}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        New Note
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canCreateNote && (
                    <TooltipContent>
                      <p className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {!hasCategories ? 'Create a category first' : 'Select a category first'}
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {isAddingCategory && (
          <div className="flex gap-2">
            <Input
              ref={newCategoryInputRef}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onBlur={handleAddCategory}
              onKeyDown={handleCategoryKeyDown}
              placeholder={addingAsTopLevel ? "New top-level category..." : `New subcategory in ${categoryName}...`}
              className="flex-1"
            />
            <Button size="sm" onClick={handleAddCategory}>Create</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAddingCategory(false)}>Cancel</Button>
          </div>
        )}
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-cards"
            type="search"
            placeholder="Search in this category..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => onSearch('')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto scrollbar-thin p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelectCard(null);
          }
        }}
      >
        {subcategories.length === 0 && cards.length === 0 && matchingCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-lg font-medium">
              {searchQuery ? 'No matching notes' : isRecycleBin ? 'Recycle bin is empty' : 'Empty category'}
            </p>
            <p className="text-sm mt-1">
              {searchQuery 
                ? 'Try a different search term' 
                : isRecycleBin 
                  ? 'Deleted notes will appear here' 
                  : 'Create notes or subcategories to get started'}
            </p>
            {isValidCategory && !searchQuery && (
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => startAddCategory(false)}>
                  <Folder className="w-4 h-4 mr-1" />
                  New Subcategory
                </Button>
                <Button onClick={handleAddNote} disabled={!canCreateNote}>
                  <Plus className="w-4 h-4 mr-1" />
                  New Note
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div 
            className="space-y-4 max-w-3xl mx-auto min-h-full"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onSelectCard(null);
              }
            }}
          >
            {subcategories.length > 0 && !searchQuery && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSubcategoryDragEnd}
              >
                <SortableContext
                  items={subcategories.map(s => s.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {subcategories.map(sub => (
                      <SortableSubcategory
                        key={sub.id}
                        subcategory={sub}
                        allCards={allCards}
                        onSelectCategory={onSelectCategory}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {matchingCategories.length > 0 && searchQuery && (
              <>
                <p className="text-xs text-muted-foreground font-medium mb-2">Matching Categories</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {matchingCategories.map(cat => (
                    <div
                      key={cat.id}
                      data-testid={`search-category-${cat.id}`}
                      className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/30 cursor-pointer transition-colors"
                      onClick={() => onSelectCategory(cat.id)}
                    >
                      <FolderOpen className="w-10 h-10 text-primary/70" />
                      <span className="text-sm font-medium text-center truncate w-full">{cat.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(() => {
                          const folderCount = cat.children.length;
                          const cardCount = allCards.filter(c => c.categoryId === cat.id && !c.isDeleted).length;
                          const parts = [];
                          if (folderCount > 0) parts.push(`${folderCount} folder${folderCount !== 1 ? 's' : ''}`);
                          if (cardCount > 0) parts.push(`${cardCount} note${cardCount !== 1 ? 's' : ''}`);
                          return parts.join(', ');
                        })()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {((subcategories.length > 0 && !searchQuery) || (matchingCategories.length > 0 && searchQuery)) && cards.length > 0 && (
              <div className="border-t border-border my-4" />
            )}

            {cards.length > 0 && !isRecycleBin && !searchQuery && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={cards.map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3 pl-6">
                    {cards.map((card, index) => (
                      <SortableCard
                        key={card.id}
                        id={card.id}
                        card={card}
                        isRecycleBin={isRecycleBin}
                        isSelected={selectedCardId === card.id}
                        onSelect={() => onSelectCard(card.id)}
                        onUpdateCard={onUpdateCard}
                        onUpdateBlocks={(blocks) => onUpdateCardBlocks(card.id, blocks)}
                        onMoveCard={handleMoveClick}
                        onDeleteCard={onDeleteCard}
                        onRestoreCard={handleRestoreClick}
                        onPermanentlyDeleteCard={onPermanentlyDeleteCard}
                        onMoveUp={() => onReorderCard(card.id, 'up')}
                        onMoveDown={() => onReorderCard(card.id, 'down')}
                        canMoveUp={index > 0}
                        canMoveDown={index < cards.length - 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {cards.length > 0 && (isRecycleBin || searchQuery) && (
              <div className="space-y-3 pl-6">
                {cards.map((card, index) => (
                  <InlineCard
                    key={card.id}
                    card={card}
                    isRecycleBin={isRecycleBin}
                    isSelected={selectedCardId === card.id}
                    onSelect={() => onSelectCard(card.id)}
                    onUpdateCard={onUpdateCard}
                    onUpdateBlocks={(blocks) => onUpdateCardBlocks(card.id, blocks)}
                    onMoveCard={handleMoveClick}
                    onDeleteCard={onDeleteCard}
                    onRestoreCard={handleRestoreClick}
                    onPermanentlyDeleteCard={onPermanentlyDeleteCard}
                    onMoveUp={() => onReorderCard(card.id, 'up')}
                    onMoveDown={() => onReorderCard(card.id, 'down')}
                    canMoveUp={index > 0}
                    canMoveDown={index < cards.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CategoryPickerDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        categories={categories}
        onSelect={handleCategorySelect}
        title={isRestoring ? "Restore to Category" : "Move to Category"}
        showRoot={false}
      />
    </div>
  );
}