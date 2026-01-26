import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Trash2, MoreHorizontal, Pencil, FolderInput, FileText, ChevronsDownUp, ChevronsUpDown, ArrowUp, Download, Upload, Home, Maximize2, Minimize2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Card, ContentBlock, CheckboxBlock } from '@/lib/types';
import { RECYCLE_BIN_ID, getAllCardIds, getDescendantIds, findCardById } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { CategoryPickerDialog } from './CategoryPickerDialog'; // We can reuse this or rename it

interface CardTreeProps {
  cards: Card[];
  selectedCardId: string | null;
  onSelectCard: (id: string | null) => void;
  onRenameCard: (id: string, title: string) => void;
  onMoveCard: (id: string, newParentId: string | null) => void;
  onReorderCard: (id: string, direction: 'up' | 'down') => void;
  onDeleteCard: (id: string) => void;
  onUpdateCardBlocks: (id: string, blocks: ContentBlock[]) => void;
  deletedCount: number;
  onExport: () => void;
  onImport: (data: any, mode: 'merge' | 'override') => void;
  onSearch: (query: string) => void;
  searchQuery: string;
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
  onReorderCard: (id: string, direction: 'up' | 'down') => void;
  onDeleteCard: (id: string) => void;
  onUpdateCardBlocks: (id: string, blocks: ContentBlock[]) => void;
  draggedCardId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string | null) => void;
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
  onReorderCard,
  onDeleteCard,
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
  const [isDragOver, setIsDragOver] = useState(false);

  const checkboxBlock = card.blocks.find(b => b.type === 'checkbox') as CheckboxBlock | undefined;

  const handleCheckboxChange = (checked: boolean) => {
    if (checkboxBlock) {
      const newBlocks = card.blocks.map(b => b.id === checkboxBlock.id ? { ...b, checked } : b);
      onUpdateCardBlocks(card.id, newBlocks);
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedCardId && draggedCardId !== card.id) {
       setIsDragOver(true);
       e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (draggedCardId && draggedCardId !== card.id) {
      onDrop(card.id);
    }
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
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer group transition-colors",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground",
          isDragging && "opacity-50",
          isDragOver && "bg-primary/20 ring-2 ring-primary/50"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelectCard(card.id)}
      >
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

        {/* Icon based on content? or just always folder/file? */}
        {hasChildren ? (
           isExpanded ? <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" /> : <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
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
            <DropdownMenuItem onClick={handleStartRename}>
              <Pencil className="w-3.5 h-3.5 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMoveCard(card.id)}>
              <FolderInput className="w-3.5 h-3.5 mr-2" />
              Move to...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onReorderCard(card.id, 'up')}>
              <ArrowUp className="w-3.5 h-3.5 mr-2" />
              Move Up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onReorderCard(card.id, 'down')}>
              <ChevronDown className="w-3.5 h-3.5 mr-2" />
              Move Down
            </DropdownMenuItem>
            {hasChildren && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onExpandRecursively(card.id, true)}>
                  <ChevronsUpDown className="w-3.5 h-3.5 mr-2" />
                  Expand All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExpandRecursively(card.id, false)}>
                  <ChevronsDownUp className="w-3.5 h-3.5 mr-2" />
                  Collapse All
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDeleteCard(card.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
              onReorderCard={onReorderCard}
              onDeleteCard={onDeleteCard}
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
    </div>
  );
}

export function CategoryTree({
  cards,
  selectedCardId,
  onSelectCard,
  onRenameCard,
  onMoveCard,
  onReorderCard,
  onDeleteCard,
  onUpdateCardBlocks,
  deletedCount,
  onExport,
  onImport,
  onSearch,
  searchQuery,
  className
}: CardTreeProps & { className?: string }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [cardToMove, setCardToMove] = useState<string | null>(null);
  const [rootDragOver, setRootDragOver] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

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

  const handleDrop = (targetId: string | null) => {
    if (draggedCardId && draggedCardId !== targetId) {
      onMoveCard(draggedCardId, targetId);
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
    handleDrop(null); // Drop to root
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
              onReorderCard={onReorderCard}
              onDeleteCard={onDeleteCard}
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
      </div>
      
      <div className="p-3 border-t border-border bg-sidebar/50 backdrop-blur-sm pb-8 md:pb-3">
        <div className="flex items-center gap-2 mb-2">
          <button
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-md transition-colors"
            onClick={onExport}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
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
        <div className="text-[10px] text-muted-foreground/40 text-center select-none">
          v2.1
        </div>
      </div>

      {/* Reusing CategoryPickerDialog but mapped to Cards */}
      <CategoryPickerDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        categories={cards as any} // Cast for compatibility with picker which expects Category[]
        onSelect={handleMoveSelect}
        title="Move to..."
        showRoot={true}
      />

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
