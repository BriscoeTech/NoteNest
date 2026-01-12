import { useState } from 'react';
import { Plus, Search, MoreVertical, Trash2, FolderInput, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Card, Category } from '@/lib/types';
import { RECYCLE_BIN_ID, ALL_NOTES_ID } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { CategoryPickerDialog } from './CategoryPickerDialog';
import { formatDistanceToNow } from 'date-fns';

interface CardListProps {
  cards: Card[];
  selectedCardId: string | null;
  categoryId: string | null;
  categoryName: string;
  isRecycleBin: boolean;
  categories: Category[];
  onSelectCard: (id: string) => void;
  onAddCard: () => void;
  onMoveCard: (cardId: string, categoryId: string | null) => void;
  onDeleteCard: (id: string) => void;
  onRestoreCard: (id: string, categoryId: string | null) => void;
  onPermanentlyDeleteCard: (id: string) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export function CardList({
  cards,
  selectedCardId,
  categoryId,
  categoryName,
  isRecycleBin,
  categories,
  onSelectCard,
  onAddCard,
  onMoveCard,
  onDeleteCard,
  onRestoreCard,
  onPermanentlyDeleteCard,
  onSearch,
  searchQuery
}: CardListProps) {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [cardToMove, setCardToMove] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleMoveClick = (cardId: string) => {
    setCardToMove(cardId);
    setIsRestoring(false);
    setMoveDialogOpen(true);
  };

  const handleRestoreClick = (cardId: string) => {
    setCardToMove(cardId);
    setIsRestoring(true);
    setMoveDialogOpen(true);
  };

  const handleCategorySelect = (targetCategoryId: string | null) => {
    if (cardToMove) {
      if (isRestoring) {
        onRestoreCard(cardToMove, targetCategoryId);
      } else {
        onMoveCard(cardToMove, targetCategoryId);
      }
    }
    setMoveDialogOpen(false);
    setCardToMove(null);
  };

  const getCardPreview = (card: Card): string => {
    if (card.content) return card.content.slice(0, 100);
    if (card.bullets.length > 0) {
      return card.bullets.map(b => '• ' + b.content).join(' ').slice(0, 100);
    }
    return 'Empty note';
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="p-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground truncate">{categoryName}</h2>
          {!isRecycleBin && (
            <Button
              data-testid="button-add-card"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={onAddCard}
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-cards"
            type="search"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => onSearch('')}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm">
              {searchQuery ? 'No matching notes' : isRecycleBin ? 'Recycle bin is empty' : 'No notes yet'}
            </p>
            {!isRecycleBin && !searchQuery && (
              <Button
                variant="link"
                size="sm"
                className="mt-1"
                onClick={onAddCard}
              >
                Create one
              </Button>
            )}
          </div>
        ) : (
          cards.map(card => (
            <ContextMenu key={card.id}>
              <ContextMenuTrigger asChild>
                <div
                  data-testid={`card-item-${card.id}`}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-all border",
                    selectedCardId === card.id
                      ? "bg-primary/5 border-primary/20 shadow-sm"
                      : "bg-background border-transparent hover:bg-accent hover:border-border"
                  )}
                  onClick={() => onSelectCard(card.id)}
                >
                  <h3 className="text-sm font-medium text-foreground truncate">
                    {card.title || 'Untitled'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {getCardPreview(card)}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    {formatDistanceToNow(card.updatedAt, { addSuffix: true })}
                  </p>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                {isRecycleBin ? (
                  <>
                    <ContextMenuItem onClick={() => handleRestoreClick(card.id)}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore to...
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem 
                      onClick={() => onPermanentlyDeleteCard(card.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Permanently
                    </ContextMenuItem>
                  </>
                ) : (
                  <>
                    <ContextMenuItem onClick={() => handleMoveClick(card.id)}>
                      <FolderInput className="w-4 h-4 mr-2" />
                      Move to...
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem 
                      onClick={() => onDeleteCard(card.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </ContextMenuItem>
                  </>
                )}
              </ContextMenuContent>
            </ContextMenu>
          ))
        )}
      </div>

      <CategoryPickerDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        categories={categories}
        onSelect={handleCategorySelect}
        title={isRestoring ? "Restore to Category" : "Move to Category"}
      />
    </div>
  );
}