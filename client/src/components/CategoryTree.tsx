import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Trash2, MoreHorizontal, Pencil, FolderInput, FileText, ChevronsDownUp, ChevronsUpDown, Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category, Card } from '@/lib/types';
import { RECYCLE_BIN_ID } from '@/lib/types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { CategoryPickerDialog } from './CategoryPickerDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface CategoryTreeProps {
  categories: Category[];
  cards: Card[];
  selectedCategoryId: string | null;
  selectedCardId: string | null;
  onSelectCategory: (id: string | null) => void;
  onSelectCard: (cardId: string, categoryId: string) => void;
  onRenameCategory: (id: string, name: string) => void;
  onMoveCategory: (id: string, newParentId: string | null) => void;
  onDeleteCategory: (id: string) => void;
  onRenameCard: (id: string, title: string) => void;
  onMoveCard: (cardId: string, categoryId: string) => void;
  onDeleteCard: (id: string) => void;
  deletedCount: number;
  onExport: () => void;
  onImport: (data: any, mode: 'merge' | 'override') => void;
}

interface CardItemProps {
  card: Card;
  depth: number;
  selectedCardId: string | null;
  categoryId: string;
  editingCardId: string | null;
  editingCardTitle: string;
  draggedCardId: string | null;
  onSelectCard: (cardId: string, categoryId: string) => void;
  onRenameCard: (cardId: string) => void;
  onMoveCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onEditingCardTitleChange: (title: string) => void;
  onFinishEditingCard: () => void;
  onCardDragStart: (cardId: string) => void;
  onCardDragEnd: () => void;
}

interface CategoryItemProps {
  category: Category;
  cards: Card[];
  depth: number;
  selectedCategoryId: string | null;
  selectedCardId: string | null;
  expandedIds: Set<string>;
  allCategories: Category[];
  onToggleExpand: (id: string) => void;
  onSelectCategory: (id: string) => void;
  onSelectCard: (cardId: string, categoryId: string) => void;
  onRenameCategory: (id: string) => void;
  onMoveCategory: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onRenameCard: (cardId: string) => void;
  onMoveCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  editingCategoryId: string | null;
  editingCategoryName: string;
  onEditingCategoryNameChange: (name: string) => void;
  onFinishEditingCategory: () => void;
  editingCardId: string | null;
  editingCardTitle: string;
  onEditingCardTitleChange: (title: string) => void;
  onFinishEditingCard: () => void;
  draggedCategoryId: string | null;
  draggedCardId: string | null;
  onCategoryDragStart: (id: string) => void;
  onCategoryDragEnd: () => void;
  onCategoryDrop: (targetId: string | null) => void;
  onCardDragStart: (cardId: string) => void;
  onCardDragEnd: () => void;
  onCardDropOnCategory: (categoryId: string) => void;
  onExpandAll: (categoryId: string) => void;
  onCollapseAll: (categoryId: string) => void;
}

function getDescendantIds(categories: Category[], id: string): string[] {
  const category = findCategory(categories, id);
  if (!category) return [];
  const ids: string[] = [];
  function traverse(cats: Category[]) {
    for (const cat of cats) {
      ids.push(cat.id);
      traverse(cat.children);
    }
  }
  traverse(category.children);
  return ids;
}

function findCategory(categories: Category[], id: string): Category | null {
  for (const cat of categories) {
    if (cat.id === id) return cat;
    const found = findCategory(cat.children, id);
    if (found) return found;
  }
  return null;
}

function CardItem({
  card,
  depth,
  selectedCardId,
  categoryId,
  editingCardId,
  editingCardTitle,
  draggedCardId,
  onSelectCard,
  onRenameCard,
  onMoveCard,
  onDeleteCard,
  onEditingCardTitleChange,
  onFinishEditingCard,
  onCardDragStart,
  onCardDragEnd
}: CardItemProps) {
  const isSelected = selectedCardId === card.id;
  const isEditing = editingCardId === card.id;
  const isDragging = draggedCardId === card.id;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onFinishEditingCard();
    } else if (e.key === 'Escape') {
      onFinishEditingCard();
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `card:${card.id}`);
    onCardDragStart(card.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-testid={`tree-card-${card.id}`}
          draggable={!isEditing}
          onDragStart={handleDragStart}
          onDragEnd={onCardDragEnd}
          className={cn(
            "flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer transition-colors group",
            isSelected
              ? "bg-primary/10 text-primary"
              : "hover:bg-accent text-muted-foreground hover:text-foreground",
            isDragging && "opacity-50"
          )}
          style={{ paddingLeft: `${(depth + 1) * 12 + 24}px` }}
          onClick={() => onSelectCard(card.id, categoryId)}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editingCardTitle}
              onChange={(e) => onEditingCardTitleChange(e.target.value)}
              onBlur={onFinishEditingCard}
              onKeyDown={handleKeyDown}
              className="h-5 py-0 px-1 text-xs flex-1"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-xs truncate flex-1">{card.title || 'Untitled'}</span>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid={`card-tree-menu-${card.id}`}
                className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-accent-foreground/10"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onRenameCard(card.id)}>
                <Pencil className="w-3.5 h-3.5 mr-2" />
                Rename
              </DropdownMenuItem>
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <ContextMenuItem onClick={() => onRenameCard(card.id)}>
          <Pencil className="w-3.5 h-3.5 mr-2" />
          Rename
        </ContextMenuItem>
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
      </ContextMenuContent>
    </ContextMenu>
  );
}

function CategoryItem({
  category,
  cards,
  depth,
  selectedCategoryId,
  selectedCardId,
  expandedIds,
  allCategories,
  onToggleExpand,
  onSelectCategory,
  onSelectCard,
  onRenameCategory,
  onMoveCategory,
  onDeleteCategory,
  onRenameCard,
  onMoveCard,
  onDeleteCard,
  editingCategoryId,
  editingCategoryName,
  onEditingCategoryNameChange,
  onFinishEditingCategory,
  editingCardId,
  editingCardTitle,
  onEditingCardTitleChange,
  onFinishEditingCard,
  draggedCategoryId,
  draggedCardId,
  onCategoryDragStart,
  onCategoryDragEnd,
  onCategoryDrop,
  onCardDragStart,
  onCardDragEnd,
  onCardDropOnCategory,
  onExpandAll,
  onCollapseAll
}: CategoryItemProps) {
  const isExpanded = expandedIds.has(category.id);
  const isSelected = selectedCategoryId === category.id;
  const isEditing = editingCategoryId === category.id;
  const hasChildren = category.children.length > 0;
  const categoryCards = cards
    .filter(c => c.categoryId === category.id && !c.isDeleted)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const hasContent = hasChildren || categoryCards.length > 0;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const isDragging = draggedCategoryId === category.id;
  const descendantIds = draggedCategoryId ? getDescendantIds(allCategories, draggedCategoryId) : [];
  const isInvalidCategoryDropTarget = draggedCategoryId === category.id || descendantIds.includes(category.id);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onFinishEditingCategory();
    } else if (e.key === 'Escape') {
      onFinishEditingCategory();
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `category:${category.id}`);
    onCategoryDragStart(category.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedCardId) {
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    } else if (draggedCategoryId && !isInvalidCategoryDropTarget) {
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (draggedCardId) {
      onCardDropOnCategory(category.id);
    } else if (draggedCategoryId && !isInvalidCategoryDropTarget) {
      onCategoryDrop(category.id);
    }
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            data-testid={`category-item-${category.id}`}
            draggable={!isEditing}
            onDragStart={handleDragStart}
            onDragEnd={onCategoryDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer group transition-colors",
              isSelected 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-accent text-foreground",
              isDragging && "opacity-50",
              isDragOver && "bg-primary/20 ring-2 ring-primary/50"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => onSelectCategory(category.id)}
          >
            <button
              data-testid={`toggle-expand-${category.id}`}
              className={cn(
                "w-4 h-4 flex items-center justify-center rounded hover:bg-accent-foreground/10",
                !hasContent && "invisible"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(category.id);
              }}
            >
              {hasContent && (isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
            </button>
            
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editingCategoryName}
                onChange={(e) => onEditingCategoryNameChange(e.target.value)}
                onBlur={onFinishEditingCategory}
                onKeyDown={handleKeyDown}
                className="h-5 py-0 px-1 text-xs"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-xs font-medium truncate flex-1">{category.name}</span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid={`category-menu-${category.id}`}
                  className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-accent-foreground/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {hasContent && (
                  <>
                    <DropdownMenuItem onClick={() => onExpandAll(category.id)}>
                      <ChevronsUpDown className="w-3.5 h-3.5 mr-2" />
                      Expand All
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCollapseAll(category.id)}>
                      <ChevronsDownUp className="w-3.5 h-3.5 mr-2" />
                      Collapse All
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => onRenameCategory(category.id)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMoveCategory(category.id)}>
                  <FolderInput className="w-3.5 h-3.5 mr-2" />
                  Move to...
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDeleteCategory(category.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-44">
          {hasContent && (
            <>
              <ContextMenuItem onClick={() => onExpandAll(category.id)}>
                <ChevronsUpDown className="w-3.5 h-3.5 mr-2" />
                Expand All
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCollapseAll(category.id)}>
                <ChevronsDownUp className="w-3.5 h-3.5 mr-2" />
                Collapse All
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => onRenameCategory(category.id)}>
            <Pencil className="w-3.5 h-3.5 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onMoveCategory(category.id)}>
            <FolderInput className="w-3.5 h-3.5 mr-2" />
            Move to...
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => onDeleteCategory(category.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isExpanded && (
        <div>
          {category.children.map(child => (
            <CategoryItem
              key={child.id}
              category={child}
              cards={cards}
              depth={depth + 1}
              selectedCategoryId={selectedCategoryId}
              selectedCardId={selectedCardId}
              expandedIds={expandedIds}
              allCategories={allCategories}
              onToggleExpand={onToggleExpand}
              onSelectCategory={onSelectCategory}
              onSelectCard={onSelectCard}
              onRenameCategory={onRenameCategory}
              onMoveCategory={onMoveCategory}
              onDeleteCategory={onDeleteCategory}
              onRenameCard={onRenameCard}
              onMoveCard={onMoveCard}
              onDeleteCard={onDeleteCard}
              editingCategoryId={editingCategoryId}
              editingCategoryName={editingCategoryName}
              onEditingCategoryNameChange={onEditingCategoryNameChange}
              onFinishEditingCategory={onFinishEditingCategory}
              editingCardId={editingCardId}
              editingCardTitle={editingCardTitle}
              onEditingCardTitleChange={onEditingCardTitleChange}
              onFinishEditingCard={onFinishEditingCard}
              draggedCategoryId={draggedCategoryId}
              draggedCardId={draggedCardId}
              onCategoryDragStart={onCategoryDragStart}
              onCategoryDragEnd={onCategoryDragEnd}
              onCategoryDrop={onCategoryDrop}
              onCardDragStart={onCardDragStart}
              onCardDragEnd={onCardDragEnd}
              onCardDropOnCategory={onCardDropOnCategory}
              onExpandAll={onExpandAll}
              onCollapseAll={onCollapseAll}
            />
          ))}
          
          {categoryCards.map(card => (
            <CardItem
              key={card.id}
              card={card}
              depth={depth}
              selectedCardId={selectedCardId}
              categoryId={category.id}
              editingCardId={editingCardId}
              editingCardTitle={editingCardTitle}
              draggedCardId={draggedCardId}
              onSelectCard={onSelectCard}
              onRenameCard={onRenameCard}
              onMoveCard={onMoveCard}
              onDeleteCard={onDeleteCard}
              onEditingCardTitleChange={onEditingCardTitleChange}
              onFinishEditingCard={onFinishEditingCard}
              onCardDragStart={onCardDragStart}
              onCardDragEnd={onCardDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryTree({
  categories,
  cards,
  selectedCategoryId,
  selectedCardId,
  onSelectCategory,
  onSelectCard,
  onRenameCategory,
  onMoveCategory,
  onDeleteCategory,
  onRenameCard,
  onMoveCard,
  onDeleteCard,
  deletedCount,
  onExport,
  onImport
}: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardTitle, setEditingCardTitle] = useState('');
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [categoryToMove, setCategoryToMove] = useState<string | null>(null);
  const [cardToMove, setCardToMove] = useState<string | null>(null);
  const [rootDragOver, setRootDragOver] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportData, setExportData] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startRenameCategory = (id: string) => {
    const category = findCategory(categories, id);
    if (category) {
      setEditingCategoryId(id);
      setEditingCategoryName(category.name);
    }
  };

  const finishEditingCategory = () => {
    if (editingCategoryId && editingCategoryName.trim()) {
      onRenameCategory(editingCategoryId, editingCategoryName.trim());
    }
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const startRenameCard = (id: string) => {
    const card = cards.find(c => c.id === id);
    if (card) {
      setEditingCardId(id);
      setEditingCardTitle(card.title);
    }
  };

  const finishEditingCard = () => {
    if (editingCardId) {
      onRenameCard(editingCardId, editingCardTitle.trim());
    }
    setEditingCardId(null);
    setEditingCardTitle('');
  };

  const handleMoveCategory = (id: string) => {
    setCategoryToMove(id);
    setCardToMove(null);
    setMoveDialogOpen(true);
  };

  const handleMoveCard = (id: string) => {
    setCardToMove(id);
    setCategoryToMove(null);
    setMoveDialogOpen(true);
  };

  const handleMoveSelect = (targetId: string | null) => {
    if (categoryToMove) {
      onMoveCategory(categoryToMove, targetId);
    } else if (cardToMove && targetId) {
      onMoveCard(cardToMove, targetId);
    }
    setCategoryToMove(null);
    setCardToMove(null);
    setMoveDialogOpen(false);
  };

  const handleCategoryDrop = (targetId: string | null) => {
    if (draggedCategoryId && draggedCategoryId !== targetId) {
      onMoveCategory(draggedCategoryId, targetId);
    }
    setDraggedCategoryId(null);
  };

  const expandAll = (categoryId: string) => {
    const idsToExpand = [categoryId, ...getDescendantIds(categories, categoryId)];
    setExpandedIds(prev => {
      const next = new Set(prev);
      idsToExpand.forEach(id => next.add(id));
      return next;
    });
  };

  const collapseAll = (categoryId: string) => {
    const idsToCollapse = [categoryId, ...getDescendantIds(categories, categoryId)];
    setExpandedIds(prev => {
      const next = new Set(prev);
      idsToCollapse.forEach(id => next.delete(id));
      return next;
    });
  };

  const handleCardDropOnCategory = (categoryId: string) => {
    if (draggedCardId) {
      onMoveCard(draggedCardId, categoryId);
    }
    setDraggedCardId(null);
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedCategoryId) {
      setRootDragOver(true);
    }
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setRootDragOver(false);
    if (draggedCategoryId) {
      handleCategoryDrop(null);
    }
  };

  const excludeIdsForMove = categoryToMove 
    ? [categoryToMove, ...getDescendantIds(categories, categoryToMove)]
    : [];

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

  const handleImportConfirm = (mode: 'merge' | 'override') => {
    if (pendingImportData) {
      onImport(pendingImportData, mode);
    }
    setImportDialogOpen(false);
    setPendingImportData(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categories</h2>
      </div>

      <div 
        className={cn(
          "flex-1 overflow-y-auto scrollbar-thin p-1.5",
          rootDragOver && "bg-primary/5"
        )}
        onDragOver={handleRootDragOver}
        onDragLeave={() => setRootDragOver(false)}
        onDrop={handleRootDrop}
      >
        {categories.length === 0 ? (
          <div 
            className="text-center py-6 text-muted-foreground text-xs px-2 cursor-pointer hover:bg-accent/50 rounded-md mx-1"
            onClick={() => onSelectCategory(null)}
          >
            <p>No categories</p>
            <p className="mt-1 opacity-70">Click here to create one</p>
          </div>
        ) : (
          categories.map(category => (
            <CategoryItem
              key={category.id}
              category={category}
              cards={cards}
              depth={0}
              selectedCategoryId={selectedCategoryId}
              selectedCardId={selectedCardId}
              expandedIds={expandedIds}
              allCategories={categories}
              onToggleExpand={toggleExpand}
              onSelectCategory={onSelectCategory}
              onSelectCard={onSelectCard}
              onRenameCategory={startRenameCategory}
              onMoveCategory={handleMoveCategory}
              onDeleteCategory={onDeleteCategory}
              onRenameCard={startRenameCard}
              onMoveCard={handleMoveCard}
              onDeleteCard={onDeleteCard}
              editingCategoryId={editingCategoryId}
              editingCategoryName={editingCategoryName}
              onEditingCategoryNameChange={setEditingCategoryName}
              onFinishEditingCategory={finishEditingCategory}
              editingCardId={editingCardId}
              editingCardTitle={editingCardTitle}
              onEditingCardTitleChange={setEditingCardTitle}
              onFinishEditingCard={finishEditingCard}
              draggedCategoryId={draggedCategoryId}
              draggedCardId={draggedCardId}
              onCategoryDragStart={setDraggedCategoryId}
              onCategoryDragEnd={() => setDraggedCategoryId(null)}
              onCategoryDrop={handleCategoryDrop}
              onCardDragStart={setDraggedCardId}
              onCardDragEnd={() => setDraggedCardId(null)}
              onCardDropOnCategory={handleCardDropOnCategory}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
            />
          ))
        )}
      </div>

      <div className="p-1.5 border-t border-border space-y-1">
        <div className="flex gap-1">
          <button
            data-testid="export-button"
            onClick={() => {
              const data = {
                version: 1,
                exportedAt: new Date().toISOString(),
                categories,
                cards
              };
              setExportData(JSON.stringify(data, null, 2));
              setExportDialogOpen(true);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent transition-colors min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            data-testid="import-button"
            onClick={() => importInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent active:bg-accent transition-colors min-h-[44px]"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
        <div
          data-testid="category-recycle-bin"
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
            selectedCategoryId === RECYCLE_BIN_ID 
              ? "bg-destructive/10 text-destructive" 
              : "hover:bg-accent text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onSelectCategory(RECYCLE_BIN_ID)}
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-xs font-medium">Recycle Bin</span>
          {deletedCount > 0 && (
            <span className="ml-auto text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {deletedCount}
            </span>
          )}
        </div>
      </div>

      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Backup</AlertDialogTitle>
            <AlertDialogDescription>
              How would you like to import this backup?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              onClick={() => handleImportConfirm('merge')}
              className="justify-start"
            >
              <span className="font-medium">Merge</span>
              <span className="ml-2 text-muted-foreground text-xs">Add imported data to existing notes</span>
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('Warning: This will permanently delete all your current categories and notes. Are you sure you want to continue?')) {
                  handleImportConfirm('override');
                }
              }}
              className="justify-start"
            >
              <span className="font-medium">Override</span>
              <span className="ml-2 text-destructive-foreground/70 text-xs">Replace all data with imported backup</span>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Export Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Copy the backup data or try downloading directly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(exportData);
                  alert('Copied to clipboard! Paste into a text file and save as .json');
                  setExportDialogOpen(false);
                } catch (err) {
                  alert('Failed to copy. Please select and copy manually.');
                }
              }}
              className="w-full"
            >
              Copy to Clipboard
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onExport();
                setExportDialogOpen(false);
              }}
            >
              Try Download
            </Button>
            <div className="mt-2 max-h-32 overflow-auto rounded border bg-muted p-2">
              <pre className="text-xs whitespace-pre-wrap break-all select-all">{exportData.slice(0, 500)}...</pre>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategoryPickerDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        categories={categories}
        onSelect={handleMoveSelect}
        title={cardToMove ? "Move Note To" : "Move Category To"}
        excludeIds={excludeIdsForMove}
        showRoot={!cardToMove}
        rootLabel="Root (Top Level)"
      />
    </div>
  );
}