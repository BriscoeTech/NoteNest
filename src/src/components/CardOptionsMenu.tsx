import { useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import {
  ArrowUp,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderInput,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CardOptionsMenuProps {
  isFolder?: boolean;
  isRecycleBin?: boolean;
  hasChildren?: boolean;
  align?: 'start' | 'end' | 'center';
  contentClassName?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  anchorPoint?: { x: number; y: number } | null;
  onAnchorPointChange?: (point: { x: number; y: number } | null) => void;
  onOpen?: () => void;
  onAddNote?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onChangeType?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onRestore?: () => void;
  onDelete: () => void;
}

export function CardOptionsMenu({
  isFolder = false,
  isRecycleBin = false,
  hasChildren = false,
  align = 'end',
  contentClassName,
  trigger,
  open,
  onOpenChange,
  anchorPoint,
  onAnchorPointChange,
  onOpen,
  onAddNote,
  onRename,
  onMove,
  onChangeType,
  onMoveUp,
  onMoveDown,
  onExpandAll,
  onCollapseAll,
  onRestore,
  onDelete,
}: CardOptionsMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalAnchorPoint, setInternalAnchorPoint] = useState<{ x: number; y: number } | null>(null);

  const isControlled = typeof open === 'boolean';
  const menuOpen = isControlled ? open : internalOpen;
  const menuAnchorPoint = anchorPoint ?? internalAnchorPoint ?? { x: 0, y: 0 };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
      if (!nextOpen) setInternalAnchorPoint(null);
    }
    if (!nextOpen) onAnchorPointChange?.(null);
    onOpenChange?.(nextOpen);
  };

  const handleTriggerClick = (event: MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const nextAnchorPoint = { x: rect.left, y: rect.bottom };
    if (!isControlled) {
      setInternalAnchorPoint(nextAnchorPoint);
    }
    onAnchorPointChange?.(nextAnchorPoint);
    handleOpenChange(true);
  };

  return (
    <DropdownMenu open={menuOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          className="fixed h-px w-px opacity-0 pointer-events-none"
          style={{ left: menuAnchorPoint.x, top: menuAnchorPoint.y }}
        />
      </DropdownMenuTrigger>
      <span onClick={handleTriggerClick}>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </span>
      <DropdownMenuContent align={align} className={contentClassName}>
        {!isRecycleBin ? (
          <>
            {isFolder && onAddNote && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddNote(); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Note
              </DropdownMenuItem>
            )}
            {isFolder && onAddNote && (onOpen || onRename || onMove) && <DropdownMenuSeparator />}
            {onOpen && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(); }}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Open
              </DropdownMenuItem>
            )}
            {onRename && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
            )}
            {onMove && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(); }}>
                <FolderInput className="mr-2 h-4 w-4" />
                Move to...
              </DropdownMenuItem>
            )}
            {(onOpen || (isFolder && onAddNote) || onRename || onMove) &&
              (onMoveUp || onMoveDown || onChangeType || (hasChildren && (onExpandAll || onCollapseAll)) || onDelete) && (
                <DropdownMenuSeparator />
              )}
            {onMoveUp && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveUp(); }}>
                <ArrowUp className="mr-2 h-4 w-4" />
                Move Up
              </DropdownMenuItem>
            )}
            {onMoveDown && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveDown(); }}>
                <ChevronDown className="mr-2 h-4 w-4" />
                Move Down
              </DropdownMenuItem>
            )}
            {(onMoveUp || onMoveDown) && (onChangeType || (hasChildren && (onExpandAll || onCollapseAll)) || onDelete) && (
              <DropdownMenuSeparator />
            )}
            {onChangeType && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onChangeType(); }}>
                <Type className="mr-2 h-4 w-4" />
                Change type...
              </DropdownMenuItem>
            )}
            {onChangeType && hasChildren && (onExpandAll || onCollapseAll) && <DropdownMenuSeparator />}
            {hasChildren && onExpandAll && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExpandAll(); }}>
                <ChevronsUpDown className="mr-2 h-4 w-4" />
                Expand All
              </DropdownMenuItem>
            )}
            {hasChildren && onCollapseAll && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCollapseAll(); }}>
                <ChevronsDownUp className="mr-2 h-4 w-4" />
                Collapse All
              </DropdownMenuItem>
            )}
            {(onChangeType || (hasChildren && (onExpandAll || onCollapseAll))) && onDelete && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        ) : (
          <>
            {onRestore && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore(); }}>
                <ArrowUp className="mr-2 h-4 w-4" />
                Restore
              </DropdownMenuItem>
            )}
            {onRestore && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Forever
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
