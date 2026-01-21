import { useState, useRef, useEffect } from 'react';
import { Plus, Search, X, Folder, FolderOpen, ChevronDown, Trash2, FolderInput, MoreVertical, MoreHorizontal, Type, List, ChevronUp, Image, GripVertical, FileText, ArrowUp } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, ContentBlock, TextBlock, BulletBlock, ImageBlock, BulletItem } from '@/lib/types';
import { generateId } from '@/lib/types';
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
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { CategoryPickerDialog } from './CategoryPickerDialog';

interface WorkspacePanelProps {
  currentCard: Card | null;
  childrenCards: Card[];
  allCards: Card[]; // used for search/move picker
  isRecycleBin: boolean;
  onNavigateCard: (id: string | null) => void;
  onAddCard: (parentId: string | null) => void;
  onUpdateCard: (id: string, updates: Partial<Card>) => void;
  onUpdateCardBlocks: (id: string, blocks: ContentBlock[]) => void;
  onMoveCard: (id: string, newParentId: string | null) => void;
  onDeleteCard: (id: string) => void;
  onRestoreCard: (id: string, targetId: string | null) => void;
  onPermanentlyDeleteCard: (id: string) => void;
  onReorderCard: (id: string, direction: 'up' | 'down') => void;
  onReorderCardsByIndex: (ids: string[]) => void; // For children reordering
  onSearch: (query: string) => void;
  searchQuery: string;
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
  onMoveStart: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

function GridCardItem({ card, onNavigate, onMoveStart, onRename, onDelete }: GridCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div 
        className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/30 transition-colors h-24 justify-center"
        {...attributes}
        {...listeners}
      >
        <Input
          value={card.title}
          onChange={(e) => onRename(e.target.value)}
          placeholder="Untitled"
          className="text-sm font-medium text-center truncate w-full px-2 border-none shadow-none focus-visible:ring-0 bg-transparent h-auto p-0 cursor-text"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
            e.stopPropagation(); // Prevent dnd interference
          }}
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on input
          onClick={(e) => e.stopPropagation()} // Prevent click propagation
        />
      </div>

       <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onNavigate(); }}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveStart(); }}>
                <FolderInput className="w-4 h-4 mr-2" />
                Move to...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
       </div>
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
  onReorderCard,
  onReorderCardsByIndex,
  onSearch,
  searchQuery
}: WorkspacePanelProps) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [cardToMove, setCardToMove] = useState<string | null>(null);

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
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleChildDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
       // Reorder children
       const oldIndex = childrenCards.findIndex(c => c.id === active.id);
       const newIndex = childrenCards.findIndex(c => c.id === over.id);
       const newOrder = arrayMove(childrenCards, oldIndex, newIndex);
       const ids = newOrder.map(c => c.id);
       onReorderCardsByIndex(ids);
    }
  };

  // Block Actions
  const addTextBlock = () => {
    if (!currentCard) return;
    // @ts-ignore
    const newBlock: TextBlock = { id: generateId(), type: 'text', content: '' };
    onUpdateCardBlocks(currentCard.id, [...currentCard.blocks, newBlock]);
  };
  
  const addBulletBlock = () => {
    if (!currentCard) return;
    // @ts-ignore
    const newBlock: BulletBlock = { id: generateId(), type: 'bullets', items: [{ id: generateId(), content: '', indent: 0 }] };
    onUpdateCardBlocks(currentCard.id, [...currentCard.blocks, newBlock]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentCard) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      // @ts-ignore
      const newBlock: ImageBlock = { id: generateId(), type: 'image', dataUrl, width: 100 };
      onUpdateCardBlocks(currentCard.id, [...currentCard.blocks, newBlock]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

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
    if (newIndex < 0 || newIndex >= currentCard.blocks.length) return;
    const newBlocks = arrayMove(currentCard.blocks, index, newIndex);
    onUpdateCardBlocks(currentCard.id, newBlocks);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-2 pl-12">
         <div className="flex-1 flex items-center gap-2 min-w-0">
           {currentCard ? (
             <>
               <h2 className="text-lg font-semibold truncate">{currentCard.title || "Untitled"}</h2>
               <Button variant="ghost" size="icon" onClick={() => onNavigateCard(currentCard.parentId)} className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground">
                 <ArrowUp className="w-4 h-4" />
               </Button>
             </>
           ) : (
             <h2 className="text-lg font-semibold">Home</h2>
           )}
         </div>
         <div className="relative w-64">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
           <Input 
             placeholder="Search..." 
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

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-8">
        {/* Current Card Content (Blocks) */}
        {currentCard && !isRecycleBin && !searchQuery && (
          <div className="max-w-3xl mx-auto space-y-4">
            <Textarea
              ref={titleRef}
              value={currentCard.title}
              onChange={(e) => onUpdateCard(currentCard.id, { title: e.target.value })}
              onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
              placeholder="Untitled"
              className="text-3xl font-bold border-none shadow-none focus-visible:ring-0 p-0 resize-none min-h-[44px] overflow-hidden placeholder:text-muted-foreground/50 bg-transparent mb-4"
              rows={1}
            />

            <DndContext
              sensors={blockSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleBlockDragEnd}
            >
              <SortableContext
                items={currentCard.blocks.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {currentCard.blocks.map((block, index) => (
                    <SortableBlock
                      key={block.id}
                      id={block.id}
                      block={block}
                      isRecycleBin={isRecycleBin}
                      isSelected={true} // Always selected in this view
                      onUpdate={(b) => updateBlock(index, b)}
                      onDelete={() => deleteBlock(index)}
                      onMoveUp={() => moveBlock(index, 'up')}
                      onMoveDown={() => moveBlock(index, 'down')}
                      canMoveUp={index > 0}
                      canMoveDown={index < currentCard.blocks.length - 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add Block Buttons */}
             <div className="flex items-center gap-2 pt-4 flex-wrap">
                <button
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                  onClick={addTextBlock}
                >
                  <Type className="w-3 h-3" /> Add text
                </button>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                  onClick={addBulletBlock}
                >
                  <List className="w-3 h-3" /> Add bullets
                </button>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
                  onClick={() => imageInputRef.current?.click()}
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
          </div>
        )}

        {/* Children Cards Grid */}
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {currentCard ? "Sub-notes" : "Notes"}
            </h3>
            <Button size="sm" onClick={() => onAddCard(currentCard?.id || null)}>
              <Plus className="w-4 h-4 mr-1" />
              New Note
            </Button>
          </div>

          {childrenCards.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground italic border-2 border-dashed rounded-lg">
               No notes here yet. Create one!
             </div>
          ) : (
            <DndContext
              sensors={childSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleChildDragEnd}
            >
              <SortableContext
                items={childrenCards.map(c => c.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {childrenCards.map(card => (
                    <GridCardItem
                      key={card.id}
                      card={card}
                      onNavigate={() => onNavigateCard(card.id)}
                      onMoveStart={() => handleMoveStart(card.id)}
                      onRename={(title) => onUpdateCard(card.id, { title })}
                      onDelete={() => onDeleteCard(card.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      <CategoryPickerDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        categories={allCards}
        onSelect={handleMoveSelect}
        title="Move to..."
        showRoot={true}
      />
    </div>
  );
}
