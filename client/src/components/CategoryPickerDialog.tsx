import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CategoryPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSelect: (categoryId: string | null) => void;
  title: string;
}

interface PickerItemProps {
  category: Category;
  depth: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
}

function PickerItem({ category, depth, expandedIds, onToggleExpand, onSelect }: PickerItemProps) {
  const isExpanded = expandedIds.has(category.id);
  const hasChildren = category.children.length > 0;

  return (
    <div>
      <div
        data-testid={`picker-category-${category.id}`}
        className="flex items-center gap-1 py-2 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(category.id)}
      >
        <button
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
        
        <span className="text-sm font-medium truncate flex-1">{category.name}</span>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {category.children.map(child => (
            <PickerItem
              key={child.id}
              category={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryPickerDialog({
  open,
  onOpenChange,
  categories,
  onSelect,
  title
}: CategoryPickerDialogProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

  const handleSelect = (categoryId: string | null) => {
    onSelect(categoryId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-80">
          <div className="py-2">
            <div
              data-testid="picker-uncategorized"
              className="flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleSelect(null)}
            >
              <FileText className="w-4 h-4 text-muted-foreground ml-5" />
              <span className="text-sm font-medium">Uncategorized</span>
            </div>
            
            {categories.length > 0 && <div className="my-2 border-t border-border mx-2" />}
            
            {categories.map(category => (
              <PickerItem
                key={category.id}
                category={category}
                depth={0}
                expandedIds={expandedIds}
                onToggleExpand={toggleExpand}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </ScrollArea>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}