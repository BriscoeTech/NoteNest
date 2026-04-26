import { useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
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

type CardMenuEntry =
  | {
      type: 'action';
      key: string;
      label: string;
      Icon: LucideIcon;
      onSelect: () => void;
      className?: string;
    }
  | {
      type: 'separator';
      key: string;
    };

function compactMenuEntries(entries: Array<CardMenuEntry | null | false | undefined>): CardMenuEntry[] {
  const compacted: CardMenuEntry[] = [];

  for (const entry of entries) {
    if (!entry) continue;
    if (entry.type === 'separator') {
      const previous = compacted[compacted.length - 1];
      if (!previous || previous.type === 'separator') continue;
    }
    compacted.push(entry);
  }

  while (compacted[compacted.length - 1]?.type === 'separator') {
    compacted.pop();
  }

  return compacted;
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
  const menuEntries = compactMenuEntries(
    isRecycleBin
      ? [
          onRestore && {
            type: 'action',
            key: 'restore',
            label: 'Restore',
            Icon: ArrowUp,
            onSelect: onRestore,
          },
          { type: 'separator', key: 'restore-delete-separator' },
          {
            type: 'action',
            key: 'delete-forever',
            label: 'Delete Forever',
            Icon: Trash2,
            onSelect: onDelete,
            className: 'text-destructive focus:text-destructive',
          },
        ]
      : [
          isFolder && onAddNote && {
            type: 'action',
            key: 'add-note',
            label: 'Add Note',
            Icon: Plus,
            onSelect: onAddNote,
          },
          { type: 'separator', key: 'create-primary-separator' },
          onOpen && {
            type: 'action',
            key: 'open',
            label: 'Open',
            Icon: FolderOpen,
            onSelect: onOpen,
          },
          onRename && {
            type: 'action',
            key: 'rename',
            label: 'Rename',
            Icon: Pencil,
            onSelect: onRename,
          },
          onMove && {
            type: 'action',
            key: 'move',
            label: 'Move to...',
            Icon: FolderInput,
            onSelect: onMove,
          },
          { type: 'separator', key: 'primary-move-separator' },
          onMoveUp && {
            type: 'action',
            key: 'move-up',
            label: 'Move Up',
            Icon: ArrowUp,
            onSelect: onMoveUp,
          },
          onMoveDown && {
            type: 'action',
            key: 'move-down',
            label: 'Move Down',
            Icon: ChevronDown,
            onSelect: onMoveDown,
          },
          { type: 'separator', key: 'move-type-separator' },
          onChangeType && {
            type: 'action',
            key: 'change-type',
            label: 'Change type...',
            Icon: Type,
            onSelect: onChangeType,
          },
          { type: 'separator', key: 'type-expand-separator' },
          hasChildren && onExpandAll && {
            type: 'action',
            key: 'expand-all',
            label: 'Expand All',
            Icon: ChevronsUpDown,
            onSelect: onExpandAll,
          },
          hasChildren && onCollapseAll && {
            type: 'action',
            key: 'collapse-all',
            label: 'Collapse All',
            Icon: ChevronsDownUp,
            onSelect: onCollapseAll,
          },
          { type: 'separator', key: 'expand-delete-separator' },
          {
            type: 'action',
            key: 'delete',
            label: 'Delete',
            Icon: Trash2,
            onSelect: onDelete,
            className: 'text-destructive focus:text-destructive',
          },
        ]
  );

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
        {menuEntries.map((entry) => {
          if (entry.type === 'separator') {
            return <DropdownMenuSeparator key={entry.key} />;
          }
          const Icon = entry.Icon;
          return (
            <DropdownMenuItem
              key={entry.key}
              onClick={(e) => {
                e.stopPropagation();
                entry.onSelect();
              }}
              className={entry.className}
            >
              <Icon className="mr-2 h-4 w-4" />
              {entry.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
