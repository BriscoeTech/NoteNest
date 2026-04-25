import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Trash2, MoreHorizontal, FileText, ChevronsDownUp, ChevronsUpDown, ArrowUp, Download, Upload, Home, Search, X, Moon, Sun, Image as ImageIcon, Brush, CheckSquare, Link as LinkIcon, RefreshCw, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Card, CardType, ContentBlock, CheckboxBlock, LinkBlock, DrawingBlock, GraphBlock } from '@/lib/types';
import { generateId } from '@/lib/types';
import { RECYCLE_BIN_ID, getAllCardIds, getDescendantIds, findCardById } from '@/lib/types';
import { RUNTIME_VERSION_DISPLAY } from '@/lib/app-version';
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
import { Input } from '@/components/ui/input';
import { CardOptionsMenu } from './CardOptionsMenu';
import { CategoryPickerDialog } from './CategoryPickerDialog'; // We can reuse this or rename it

const TREE_EXPANDED_STORAGE_KEY = 'notenest-tree-expanded';

interface CardTreeProps {
  cards: Card[];
  isLoaded: boolean;
  selectedCardId: string | null;
  onSelectCard: (id: string | null) => void;
  onAddCard: (parentId: string | null, cardType?: CardType) => string;
  onRenameCard: (id: string, title: string) => void;
  onMoveCard: (id: string, newParentId: string | null) => void;
  onInsertCardRelative: (id: string, targetId: string, position: 'before' | 'after') => void;
  onReorderCard: (id: string, direction: 'up' | 'down') => void;
  onDeleteCard: (id: string) => void;
  onUpdateCard: (id: string, updates: Partial<Card>) => void;
  onUpdateCardBlocks: (id: string, blocks: ContentBlock[]) => void;
  deletedCount: number;
  onExport: () => void;
  onImport: (data: any, mode: 'merge' | 'override') => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

interface TreeItemProps {
  card: Card;
  depth: number;
  selectedCardId: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onExpandRecursively: (id: string, expand: boolean) => void;
  onSelectCard: (id: string) => void;
  onRenameCard: (id: string, title: string) => void;
  onMoveCard: (id: string) => void;
  onAddChildNote: (parentId: string) => void;
  onInsertCardRelative: (id: string, targetId: string, position: 'before' | 'after') => void;
  onReorderCard: (id: string, direction: 'up' | 'down') => void;
  onDeleteCard: (id: string) => void;
  onUpdateCard: (id: string, updates: Partial<Card>) => void;
  onUpdateCardBlocks: (id: string, blocks: ContentBlock[]) => void;
  draggedCardId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string, position: 'before' | 'after') => void;
}

const CARD_TYPE_ORDER: CardType[] = ['note', 'checkbox', 'link', 'image', 'drawing', 'graph', 'folder'];
const CARD_TYPE_LABELS: Record<CardType, string> = {
  note: 'Note',
  checkbox: 'Checkbox',
  link: 'Link',
  image: 'Image',
  drawing: 'Drawing',
  graph: 'Graph',
  folder: 'Folder',
};

function typeIcon(type: CardType) {
  if (type === 'folder') return <Folder className="w-4 h-4" />;
  if (type === 'checkbox') return <CheckSquare className="w-4 h-4" />;
  if (type === 'link') return <LinkIcon className="w-4 h-4" />;
  if (type === 'image') return <ImageIcon className="w-4 h-4" />;
  if (type === 'drawing') return <Brush className="w-4 h-4" />;
  if (type === 'graph') return <LayoutGrid className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

function createEmptyGraphBlock(): GraphBlock {
  return {
    id: generateId(),
    type: 'graph',
    rows: 2,
    columns: 2,
    cells: Array.from({ length: 4 }, () => ({ text: '', color: '#ffffff' })),
  };
}

function TreeItem({
  card,
  depth,
  selectedCardId,
  expandedIds,
  onToggleExpand,
  onExpandRecursively,
  onSelectCard,
  onRenameCard,
  onMoveCard,
  onAddChildNote,
  onInsertCardRelative,
  onReorderCard,
  onDeleteCard,
  onUpdateCard,
  onUpdateCardBlocks,
  draggedCardId,
  onDragStart,
  onDragEnd,
  onDrop
}: TreeItemProps) {
  const isExpanded = expandedIds.has(card.id);
  const isSelected = selectedCardId === card.id;
  const hasChildren = card.children && card.children.length > 0 && card.children.some(c => !c.isDeleted);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchorPoint, setMenuAnchorPoint] = useState<{ x: number; y: number } | null>(null);

  const checkboxBlock = card.cardType === 'checkbox'
    ? card.blocks.find(b => b.type === 'checkbox') as CheckboxBlock | undefined
    : undefined;

  const handleCheckboxChange = (checked: boolean) => {
    if (checkboxBlock) {
      const newBlocks = card.blocks.map(b => b.id === checkboxBlock.id ? { ...b, checked } : b);
      onUpdateCardBlocks(card.id, newBlocks);
    }
  };

  const handleChangeCardType = (nextType: CardType) => {
    if (card.cardType === nextType) return;
    onUpdateCard(card.id, { cardType: nextType });
    const hasTypeBlock = card.blocks.some((block) => {
      if (nextType === 'note') return block.type === 'text' || block.type === 'bullets';
      return block.type === nextType;
    });
    if (hasTypeBlock || nextType === 'folder' || nextType === 'image') return;

    if (nextType === 'note') {
      onUpdateCardBlocks(card.id, [...card.blocks, { id: generateId(), type: 'text', content: '' }]);
      return;
    }
    if (nextType === 'checkbox') {
      onUpdateCardBlocks(card.id, [...card.blocks, { id: generateId(), type: 'checkbox', checked: false }]);
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
        previewDataUrl: '',
        historyPast: [],
        historyFuture: [],
      };
      onUpdateCardBlocks(card.id, [...card.blocks, newBlock]);
      return;
    }
    if (nextType === 'graph') {
      onUpdateCardBlocks(card.id, [...card.blocks, createEmptyGraphBlock()]);
    }
  };

  const isDragging = draggedCardId === card.id;
  // Check if this card is a descendant of the dragged card (to prevent drop loops)
  // We need all cards for this check properly, but locally we can just check if we are dropping onto ourselves
  // Note: getDescendantIds check would need the full tree. For now just prevent self-drop.
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartRename = () => {
    setIsEditing(true);
    setEditTitle(card.title);
  };

  const handleFinishRename = () => {
    if (editTitle.trim()) {
      onRenameCard(card.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFinishRename();
    if (e.key === 'Escape') setIsEditing(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `card:${card.id}`);
    onDragStart(card.id);
  };

  const getDropPosition = (e: React.DragEvent<HTMLDivElement>): 'before' | 'after' => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    return offsetY < rect.height / 2 ? 'before' : 'after';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedCardId && draggedCardId !== card.id) {
      setDropPosition(getDropPosition(e));
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const nextPosition = getDropPosition(e);
    setDropPosition(null);
    if (draggedCardId && draggedCardId !== card.id) {
      onDrop(card.id, nextPosition);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuAnchorPoint({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  return (
    <div>
      <div
        draggable={!isEditing}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer group transition-colors",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground",
          isDragging && "opacity-50",
          dropPosition && "bg-primary/10"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelectCard(card.id)}
        onContextMenu={handleContextMenu}
      >
        {dropPosition && (
          <div
            className={cn(
              "pointer-events-none absolute left-2 right-2 h-0.5 rounded-full bg-primary shadow-[0_0_0_1px_hsl(var(--background))]",
              dropPosition === 'before' ? "top-0" : "bottom-0"
            )}
          />
        )}
        <button
          className={cn(
            "w-4 h-4 flex items-center justify-center rounded hover:bg-accent-foreground/10 z-20 shrink-0",
            !hasChildren && "invisible"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(card.id);
          }}
        >
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {checkboxBlock && (
          <input
            type="checkbox"
            checked={checkboxBlock.checked}
            onChange={(e) => handleCheckboxChange(e.target.checked)}
            className="h-3.5 w-3.5 mr-1 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {card.cardType === 'folder' ? (
          isExpanded ? <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" /> : <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : card.cardType === 'checkbox' ? (
          // Checkbox-type rows use the checkbox control as the leading marker.
          // Do not render an extra type icon for this row type.
          null
        ) : card.cardType === 'link' ? (
          <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : card.cardType === 'image' ? (
          <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : card.cardType === 'drawing' ? (
          <Brush className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        )}

        {isEditing ? (
          <Input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleFinishRename}
            onKeyDown={handleKeyDown}
            className="h-5 py-0 px-1 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={cn("text-xs font-medium break-words whitespace-normal flex-1", checkboxBlock?.checked && "line-through text-muted-foreground")}>{card.title || "Untitled"}</span>
        )}

        <CardOptionsMenu
          isFolder={card.cardType === 'folder'}
          hasChildren={hasChildren}
          open={menuOpen}
          onOpenChange={(open) => {
            setMenuOpen(open);
            if (!open) setMenuAnchorPoint(null);
          }}
          onAnchorPointChange={setMenuAnchorPoint}
          anchorPoint={menuAnchorPoint}
          contentClassName="w-44"
          trigger={
            <button
              className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-accent-foreground/10"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          }
          onAddNote={card.cardType === 'folder' ? () => onAddChildNote(card.id) : undefined}
          onRename={handleStartRename}
          onMove={() => onMoveCard(card.id)}
          onChangeType={() => setTypeDialogOpen(true)}
          onMoveUp={() => onReorderCard(card.id, 'up')}
          onMoveDown={() => onReorderCard(card.id, 'down')}
          onExpandAll={hasChildren ? () => onExpandRecursively(card.id, true) : undefined}
          onCollapseAll={hasChildren ? () => onExpandRecursively(card.id, false) : undefined}
          onDelete={() => onDeleteCard(card.id)}
        />
      </div>

      {isExpanded && hasChildren && (
        <div>
          {card.children
            .filter(c => !c.isDeleted)
            .sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0)) // Using sortOrder or UpdatedAt?
            // Legacy categories had sortOrder. Cards had updatedAt.
            // Let's use updatedAt for now as default sort.
            // actually user might want manual sort later.
            .map(child => (
            <TreeItem
              key={child.id}
              card={child}
              depth={depth + 1}
              selectedCardId={selectedCardId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelectCard={onSelectCard}
              onRenameCard={onRenameCard}
              onMoveCard={onMoveCard}
              onAddChildNote={onAddChildNote}
              onInsertCardRelative={onInsertCardRelative}
              onReorderCard={onReorderCard}
              onDeleteCard={onDeleteCard}
              onUpdateCard={onUpdateCard}
              onUpdateCardBlocks={onUpdateCardBlocks}
              onExpandRecursively={onExpandRecursively}
              draggedCardId={draggedCardId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}

      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Note Type</DialogTitle>
            <DialogDescription>Choose a new type. Existing data is kept.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {CARD_TYPE_ORDER.map((type) => (
              <button
                key={type}
                type="button"
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                disabled={card.cardType === type}
                onClick={() => {
                  handleChangeCardType(type);
                  setTypeDialogOpen(false);
                }}
              >
                {typeIcon(type)}
                <span>{CARD_TYPE_LABELS[type]}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CategoryTree({
  cards,
  isLoaded,
  selectedCardId,
  onSelectCard,
  onAddCard,
  onRenameCard,
  onMoveCard,
  onInsertCardRelative,
  onReorderCard,
  onDeleteCard,
  onUpdateCard,
  onUpdateCardBlocks,
  deletedCount,
  onExport,
  onImport,
  onSearch,
  searchQuery,
  isDarkMode,
  onToggleDarkMode,
  className
}: CardTreeProps & { className?: string }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = window.localStorage.getItem(TREE_EXPANDED_STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter((value): value is string => typeof value === 'string'));
    } catch {
      return new Set();
    }
  });
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [cardToMove, setCardToMove] = useState<string | null>(null);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeDialogParentId, setTypeDialogParentId] = useState<string | null>(null);
  const [rootDragOver, setRootDragOver] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoaded) return;
    const validIds = new Set(getAllCardIds(cards));
    setExpandedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      if (next.size === prev.size) {
        let changed = false;
        for (const id of prev) {
          if (!next.has(id)) {
            changed = true;
            break;
          }
        }
        if (!changed) return prev;
      }
      return next;
    });
  }, [cards, isLoaded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TREE_EXPANDED_STORAGE_KEY, JSON.stringify(Array.from(expandedIds)));
  }, [expandedIds]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandRecursively = (id: string | null, expand: boolean) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      let idsToToggle: string[] = [];
      
      if (id === null) {
        // All cards
        idsToToggle = getAllCardIds(cards);
      } else {
        // Descendants
        const card = findCardById(cards, id);
        if (card) {
          idsToToggle = [id, ...getDescendantIds(cards, id)];
        }
      }

      if (expand) {
        idsToToggle.forEach(i => next.add(i));
      } else {
        idsToToggle.forEach(i => next.delete(i));
      }
      return next;
    });
  };

  const handleDragStart = (id: string) => {
    setDraggedCardId(id);
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setRootDragOver(false);
  };

  const handleDrop = (targetId: string, position: 'before' | 'after') => {
    if (draggedCardId && draggedCardId !== targetId) {
      onInsertCardRelative(draggedCardId, targetId, position);
    }
    setDraggedCardId(null);
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedCardId) setRootDragOver(true);
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setRootDragOver(false);
    if (draggedCardId) {
      onMoveCard(draggedCardId, null);
      setDraggedCardId(null);
    }
  };

  const handleMoveClick = (id: string) => {
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
    ? [cardToMove, ...getDescendantIds(cards, cardToMove)]
    : [];

  const handleAddChildNote = (parentId: string) => {
    setTypeDialogParentId(parentId);
    setTypeDialogOpen(true);
  };

  const handleChangeCardType = (card: Card, nextType: CardType) => {
    if (card.cardType === nextType) return;
    onUpdateCard(card.id, { cardType: nextType });
    const hasTypeBlock = card.blocks.some((block) => {
      if (nextType === 'note') return block.type === 'text' || block.type === 'bullets';
      return block.type === nextType;
    });
    if (hasTypeBlock || nextType === 'folder' || nextType === 'image') return;

    if (nextType === 'note') {
      onUpdateCardBlocks(card.id, [...card.blocks, { id: generateId(), type: 'text', content: '' }]);
      return;
    }
    if (nextType === 'checkbox') {
      onUpdateCardBlocks(card.id, [...card.blocks, { id: generateId(), type: 'checkbox', checked: false }]);
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
        previewDataUrl: '',
        historyPast: [],
        historyFuture: [],
      };
      onUpdateCardBlocks(card.id, [...card.blocks, newBlock]);
      return;
    }
    if (nextType === 'graph') {
      onUpdateCardBlocks(card.id, [...card.blocks, createEmptyGraphBlock()]);
    }
  };

  const createCardByType = (parentId: string | null, type: CardType) => {
    if (type === 'image') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const dataUrl = loadEvent.target?.result as string;
          const id = onAddCard(parentId, 'image');
          const block = { id: generateId(), type: 'image', dataUrl, width: 100 } as ContentBlock;
          onUpdateCardBlocks(id, [block]);
          onSelectCard(id);
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }

    const id = onAddCard(parentId, type);
    if (type === 'checkbox') {
      onUpdateCardBlocks(id, [{ id: generateId(), type: 'checkbox', checked: false }]);
    } else if (type === 'link') {
      onUpdateCardBlocks(id, [{ id: generateId(), type: 'link', url: '' }]);
    } else if (type === 'drawing') {
      onUpdateCardBlocks(id, [{
        id: generateId(),
        type: 'drawing',
        strokes: [],
        groups: [],
        redoStrokes: [],
        previewDataUrl: '',
        historyPast: [],
        historyFuture: [],
      }]);
    } else if (type === 'graph') {
      onUpdateCardBlocks(id, [createEmptyGraphBlock()]);
    }
    onSelectCard(id);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setPendingImportData(data);
        setImportDialogOpen(true);
      } catch (error) {
        alert('Invalid file format. Please select a valid backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-3 pl-10 border-b border-border">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cards</h2>
      </div>

      <div className="px-3 pt-3 pb-1">
         <div className="relative">
           <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
           <Input 
             placeholder="Search..." 
             value={searchQuery}
             onChange={(e) => onSearch(e.target.value)}
             className="pl-8 h-8 text-xs bg-muted/40"
           />
           {searchQuery && (
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => onSearch('')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
         </div>
      </div>

      <div 
        className={cn("flex-1 overflow-y-auto scrollbar-thin p-1.5", rootDragOver && "bg-primary/5")}
        onDragOver={handleRootDragOver}
        onDragLeave={() => setRootDragOver(false)}
        onDrop={handleRootDrop}
      >
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors text-muted-foreground hover:text-foreground mb-1 group relative",
            selectedCardId === null && "bg-primary/10 text-primary"
          )}
          onClick={() => onSelectCard(null)}
        >
          <Home className="w-4 h-4 ml-6" />
          <span className="text-sm font-medium flex-1">Home</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-accent-foreground/10"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => handleExpandRecursively(null, true)}>
                <ChevronsUpDown className="w-3.5 h-3.5 mr-2" />
                Expand All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExpandRecursively(null, false)}>
                <ChevronsDownUp className="w-3.5 h-3.5 mr-2" />
                Collapse All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {cards
          .filter(c => !c.isDeleted)
          .map(card => (
            <TreeItem
              key={card.id}
              card={card}
              depth={0}
              selectedCardId={selectedCardId}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              onSelectCard={onSelectCard}
              onRenameCard={onRenameCard}
              onMoveCard={handleMoveClick}
              onAddChildNote={handleAddChildNote}
              onInsertCardRelative={onInsertCardRelative}
              onReorderCard={onReorderCard}
              onDeleteCard={onDeleteCard}
              onUpdateCard={onUpdateCard}
              onUpdateCardBlocks={onUpdateCardBlocks}
              onExpandRecursively={handleExpandRecursively}
              draggedCardId={draggedCardId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
            />
        ))}

        <div className="mt-4 pt-4 border-t border-border">
          <div
            className={cn(
              "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors text-muted-foreground hover:text-foreground",
              selectedCardId === RECYCLE_BIN_ID && "bg-primary/10 text-primary"
            )}
            onClick={() => onSelectCard(RECYCLE_BIN_ID)}
          >
            <Trash2 className="w-4 h-4 ml-6" />
            <span className="text-sm font-medium">Recycle Bin</span>
            {deletedCount > 0 && (
              <span className="ml-auto text-xs bg-muted-foreground/20 px-1.5 rounded-full">
                {deletedCount}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-md transition-colors"
              onClick={onExport}
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-md transition-colors"
              onClick={() => importInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" /> Import
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
          <div className="mb-2 border-t border-border" />
          <div className="mb-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-label={isDarkMode ? 'Disable dark mode' : 'Enable dark mode'}
              aria-pressed={isDarkMode}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-md transition-colors"
              onClick={onToggleDarkMode}
            >
              {isDarkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Dark</span>
            </button>
            <button
              type="button"
              aria-label="Refresh app"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-md transition-colors"
              onClick={() => {
                window.location.reload();
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
          <div className="mb-2 border-t border-border" />
          <div className="text-[10px] text-muted-foreground/40 text-center select-none">
            {RUNTIME_VERSION_DISPLAY}
          </div>
        </div>
      </div>

      {/* Reusing CategoryPickerDialog but mapped to Cards */}
      <CategoryPickerDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        categories={cards as any} // Cast for compatibility with picker which expects Category[]
        onSelect={handleMoveSelect}
        title="Move to..."
        excludeIds={moveExcludeIds}
        showRoot={true}
      />

      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Note Type</DialogTitle>
            <DialogDescription>Choose the type for your new note.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {CARD_TYPE_ORDER.map((type) => (
              <button
                key={type}
                type="button"
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                onClick={() => {
                  createCardByType(typeDialogParentId, type);
                  setTypeDialogOpen(false);
                }}
              >
                {typeIcon(type)}
                <span>{CARD_TYPE_LABELS[type]}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      {importDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Import Data</h3>
            <p className="text-sm text-muted-foreground mb-6">
              How would you like to import this data?
            </p>
            <div className="space-y-3">
              <button
                className="w-full flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent transition-colors"
                onClick={() => { onImport(pendingImportData, 'merge'); setImportDialogOpen(false); }}
              >
                <div className="text-left">
                  <div className="font-medium">Merge</div>
                  <div className="text-xs text-muted-foreground">Keep existing cards and add new ones</div>
                </div>
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                className="w-full flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent hover:text-destructive transition-colors"
                onClick={() => { onImport(pendingImportData, 'override'); setImportDialogOpen(false); }}
              >
                <div className="text-left">
                  <div className="font-medium">Override</div>
                  <div className="text-xs text-muted-foreground">Replace all current cards</div>
                </div>
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                className="w-full p-2 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => { setImportDialogOpen(false); setPendingImportData(null); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
