import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Trash2, MoreHorizontal, Pencil, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';
import { ALL_NOTES_ID, RECYCLE_BIN_ID } from '@/lib/types';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CategoryTreeProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddCategory: (name: string, parentId: string | null) => void;
  onRenameCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  deletedCount: number;
}

interface CategoryItemProps {
  category: Category;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  editingName: string;
  onEditingNameChange: (name: string) => void;
  onFinishEditing: () => void;
}

function CategoryItem({
  category,
  depth,
  selectedId,
  expandedIds,
  onToggleExpand,
  onSelect,
  onAddChild,
  onRename,
  onDelete,
  editingId,
  editingName,
  onEditingNameChange,
  onFinishEditing
}: CategoryItemProps) {
  const isExpanded = expandedIds.has(category.id);
  const isSelected = selectedId === category.id;
  const isEditing = editingId === category.id;
  const hasChildren = category.children.length > 0;
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            data-testid={`category-item-${category.id}`}
            className={cn(
              "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer group transition-colors",
              isSelected 
                ? "bg-primary/10 text-primary" 
                : "hover:bg-accent text-foreground"
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
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onAddChild(category.id)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subcategory
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRename(category.id)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
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
        <ContextMenuContent className="w-40">
          <ContextMenuItem onClick={() => onAddChild(category.id)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Subcategory
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onRename(category.id)}>
            <Pencil className="w-4 h-4 mr-2" />
            Rename
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
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onRename={onRename}
              onDelete={onDelete}
              editingId={editingId}
              editingName={editingName}
              onEditingNameChange={onEditingNameChange}
              onFinishEditing={onFinishEditing}
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
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  deletedCount
}: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isAddingRoot, setIsAddingRoot] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingToParent, setAddingToParent] = useState<string | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((isAddingRoot || addingToParent) && newInputRef.current) {
      newInputRef.current.focus();
    }
  }, [isAddingRoot, addingToParent]);

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

  const startAddChild = (parentId: string) => {
    setAddingToParent(parentId);
    setNewCategoryName('');
    setExpandedIds(prev => new Set([...Array.from(prev), parentId]));
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim(), addingToParent);
    }
    setIsAddingRoot(false);
    setAddingToParent(null);
    setNewCategoryName('');
  };

  const handleNewCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCategory();
    } else if (e.key === 'Escape') {
      setIsAddingRoot(false);
      setAddingToParent(null);
      setNewCategoryName('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categories</h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
        <div
          data-testid="category-all-notes"
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
            selectedId === ALL_NOTES_ID 
              ? "bg-primary/10 text-primary" 
              : "hover:bg-accent text-foreground"
          )}
          onClick={() => onSelect(ALL_NOTES_ID)}
        >
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">All Notes</span>
        </div>

        <div className="my-2 border-t border-border" />

        {categories.map(category => (
          <CategoryItem
            key={category.id}
            category={category}
            depth={0}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onToggleExpand={toggleExpand}
            onSelect={onSelect}
            onAddChild={startAddChild}
            onRename={startRename}
            onDelete={onDeleteCategory}
            editingId={editingId}
            editingName={editingName}
            onEditingNameChange={setEditingName}
            onFinishEditing={finishEditing}
          />
        ))}

        {(isAddingRoot || addingToParent) && !addingToParent && (
          <div className="flex items-center gap-1 py-1 px-2" style={{ paddingLeft: '8px' }}>
            <Folder className="w-4 h-4 text-muted-foreground ml-4" />
            <Input
              ref={newInputRef}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onBlur={handleAddCategory}
              onKeyDown={handleNewCategoryKeyDown}
              placeholder="Category name..."
              className="h-6 py-0 px-1 text-sm flex-1"
            />
          </div>
        )}
      </div>

      <div className="p-2 border-t border-border space-y-1">
        <Button
          data-testid="button-add-category"
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => {
            setIsAddingRoot(true);
            setAddingToParent(null);
            setNewCategoryName('');
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Category
        </Button>

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
    </div>
  );
}

function findCategory(categories: Category[], id: string): Category | null {
  for (const cat of categories) {
    if (cat.id === id) return cat;
    const found = findCategory(cat.children, id);
    if (found) return found;
  }
  return null;
}