import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Trash2, MoreHorizontal, Pencil, FolderInput, FolderPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';
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

interface CategoryTreeProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRenameCategory: (id: string, name: string) => void;
  onMoveCategory: (id: string, newParentId: string | null) => void;
  onDeleteCategory: (id: string) => void;
  deletedCount: number;
}

interface CategoryItemProps {
  category: Category;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  allCategories: Category[];
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onRename: (id: string) => void;
  onMove: (id: string) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  editingName: string;
  onEditingNameChange: (name: string) => void;
  onFinishEditing: () => void;
  draggedId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string | null) => void;
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

function CategoryItem({
  category,
  depth,
  selectedId,
  expandedIds,
  allCategories,
  onToggleExpand,
  onSelect,
  onRename,
  onMove,
  onDelete,
  editingId,
  editingName,
  onEditingNameChange,
  onFinishEditing,
  draggedId,
  onDragStart,
  onDragEnd,
  onDrop
}: CategoryItemProps) {
  const isExpanded = expandedIds.has(category.id);
  const isSelected = selectedId === category.id;
  const isEditing = editingId === category.id;
  const hasChildren = category.children.length > 0;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const isDragging = draggedId === category.id;
  const descendantIds = draggedId ? getDescendantIds(allCategories, draggedId) : [];
  const isInvalidDropTarget = draggedId === category.id || descendantIds.includes(category.id);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onFinishEditing();
    } else if (e.key === 'Escape') {
      onFinishEditing();
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', category.id);
    onDragStart(category.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isInvalidDropTarget && draggedId) {
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!isInvalidDropTarget && draggedId) {
      onDrop(category.id);
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
            onDragEnd={onDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer group transition-colors",
              isSelected 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-accent text-foreground",
              isDragging && "opacity-50",
              isDragOver && !isInvalidDropTarget && "bg-primary/20 ring-2 ring-primary/50"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => onSelect(category.id)}
          >
            <button
              data-testid={`toggle-expand-${category.id}`}
              className={cn(
                "w-4 h-4 flex items-center justify-center rounded hover:bg-accent-foreground/10",
                !hasChildren && "invisible"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(category.id);
              }}
            >
              {hasChildren && (isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
            </button>
            
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Folder className="w-4 h-4 text-muted-foreground" />
            )}
            
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editingName}
                onChange={(e) => onEditingNameChange(e.target.value)}
                onBlur={onFinishEditing}
                onKeyDown={handleKeyDown}
                className="h-6 py-0 px-1 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm font-medium truncate flex-1">{category.name}</span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid={`category-menu-${category.id}`}
                  className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-accent-foreground/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onRename(category.id)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMove(category.id)}>
                  <FolderInput className="w-4 h-4 mr-2" />
                  Move to...
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(category.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => onRename(category.id)}>
            <Pencil className="w-4 h-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onMove(category.id)}>
            <FolderInput className="w-4 h-4 mr-2" />
            Move to...
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => onDelete(category.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isExpanded && hasChildren && (
        <div>
          {category.children.map(child => (
            <CategoryItem
              key={child.id}
              category={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              allCategories={allCategories}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
              editingId={editingId}
              editingName={editingName}
              onEditingNameChange={onEditingNameChange}
              onFinishEditing={onFinishEditing}
              draggedId={draggedId}
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
  categories,
  selectedId,
  onSelect,
  onRenameCategory,
  onMoveCategory,
  onDeleteCategory,
  deletedCount
}: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [categoryToMove, setCategoryToMove] = useState<string | null>(null);
  const [rootDragOver, setRootDragOver] = useState(false);

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

  const startRename = (id: string) => {
    const category = findCategory(categories, id);
    if (category) {
      setEditingId(id);
      setEditingName(category.name);
    }
  };

  const finishEditing = () => {
    if (editingId && editingName.trim()) {
      onRenameCategory(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleMove = (id: string) => {
    setCategoryToMove(id);
    setMoveDialogOpen(true);
  };

  const handleMoveSelect = (targetId: string | null) => {
    if (categoryToMove) {
      onMoveCategory(categoryToMove, targetId);
    }
    setCategoryToMove(null);
    setMoveDialogOpen(false);
  };

  const handleDrop = (targetId: string | null) => {
    if (draggedId && draggedId !== targetId) {
      onMoveCategory(draggedId, targetId);
    }
    setDraggedId(null);
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedId) {
      setRootDragOver(true);
    }
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setRootDragOver(false);
    if (draggedId) {
      handleDrop(null);
    }
  };

  const excludeIdsForMove = categoryToMove 
    ? [categoryToMove, ...getDescendantIds(categories, categoryToMove)]
    : [];

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categories</h2>
      </div>

      <div 
        className={cn(
          "flex-1 overflow-y-auto scrollbar-thin p-2",
          rootDragOver && "bg-primary/5"
        )}
        onDragOver={handleRootDragOver}
        onDragLeave={() => setRootDragOver(false)}
        onDrop={handleRootDrop}
      >
        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>No categories yet</p>
            <p className="text-xs mt-1">Create one from the right panel</p>
          </div>
        ) : (
          categories.map(category => (
            <CategoryItem
              key={category.id}
              category={category}
              depth={0}
              selectedId={selectedId}
              expandedIds={expandedIds}
              allCategories={categories}
              onToggleExpand={toggleExpand}
              onSelect={onSelect}
              onRename={startRename}
              onMove={handleMove}
              onDelete={onDeleteCategory}
              editingId={editingId}
              editingName={editingName}
              onEditingNameChange={setEditingName}
              onFinishEditing={finishEditing}
              draggedId={draggedId}
              onDragStart={setDraggedId}
              onDragEnd={() => setDraggedId(null)}
              onDrop={handleDrop}
            />
          ))
        )}
      </div>

      <div className="p-2 border-t border-border">
        <div
          data-testid="category-recycle-bin"
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
            selectedId === RECYCLE_BIN_ID 
              ? "bg-destructive/10 text-destructive" 
              : "hover:bg-accent text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onSelect(RECYCLE_BIN_ID)}
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-sm font-medium">Recycle Bin</span>
          {deletedCount > 0 && (
            <span className="ml-auto text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {deletedCount}
            </span>
          )}
        </div>
      </div>

      <CategoryPickerDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        categories={categories}
        onSelect={handleMoveSelect}
        title="Move Category To"
        excludeIds={excludeIdsForMove}
        showRoot={true}
        rootLabel="Root (Top Level)"
      />
    </div>
  );
}