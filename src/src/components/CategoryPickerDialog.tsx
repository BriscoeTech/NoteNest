import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Card } from '@/lib/types';
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
  categories: Card[]; // Reusing name for compatibility but it's cards
  onSelect: (id: string | null) => void;
  title: string;
  excludeIds?: string[];
  showRoot?: boolean;
  rootLabel?: string;
}

interface PickerItemProps {
  card: Card;
  depth: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  excludeIds: string[];
}

function PickerItem({ card, depth, expandedIds, onToggleExpand, onSelect, excludeIds }: PickerItemProps) {
  const isExpanded = expandedIds.has(card.id);
  const hasChildren = card.children && card.children.length > 0;
  const isExcluded = excludeIds.includes(card.id);

  if (isExcluded) return null;

  return (
    <div>
      <div
        className="flex items-center gap-1 py-2 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(card.id)}
      >
        <button
          className={cn(
            "w-4 h-4 flex items-center justify-center rounded hover:bg-accent-foreground/10",
            !hasChildren && "invisible"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(card.id);
          }}
        >
          {hasChildren && (isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
        </button>
        
        {hasChildren ? (
          isExpanded ? <FolderOpen className="w-4 h-4 text-muted-foreground" /> : <Folder className="w-4 h-4 text-muted-foreground" />
        ) : (
          <FileText className="w-4 h-4 text-muted-foreground" />
        )}
        
        <span className="text-sm font-medium truncate flex-1">{card.title || "Untitled"}</span>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {card.children.map(child => (
            <PickerItem
              key={child.id}
              card={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              excludeIds={excludeIds}
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
  categories, // actually cards
  onSelect,
  title,
  excludeIds = [],
  showRoot = true,
  rootLabel = "Home (Root)"
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

  const handleSelect = (id: string | null) => {
    onSelect(id);
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
            {showRoot && (
              <div
                className="flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleSelect(null)}
              >
                <Home className="w-4 h-4 text-muted-foreground ml-5" />
                <span className="text-sm font-medium">{rootLabel}</span>
              </div>
            )}
            
            {categories.length > 0 && showRoot && <div className="my-2 border-t border-border mx-2" />}
            
            {categories.map(card => (
              <PickerItem
                key={card.id}
                card={card}
                depth={0}
                expandedIds={expandedIds}
                onToggleExpand={toggleExpand}
                onSelect={handleSelect}
                excludeIds={excludeIds}
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
