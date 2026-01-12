import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Search, MoreVertical, Trash2, FolderInput, RotateCcw, X } from 'lucide-react';
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
import { CardEditor } from './CardEditor';
import { formatDistanceToNow } from 'date-fns';

interface WorkspacePanelProps {
  cards: Card[];
  selectedCardId: string | null;
  categoryId: string | null;
  categoryName: string;
  isRecycleBin: boolean;
  categories: Category[];
  onSelectCard: (id: string | null) => void;
  onAddCard: () => void;
  onUpdateCard: (id: string, updates: Partial<Card>) => void;
  onMoveCard: (cardId: string, categoryId: string | null) => void;
  onDeleteCard: (id: string) => void;
  onRestoreCard: (id: string, categoryId: string | null) => void;
  onPermanentlyDeleteCard: (id: string) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export function WorkspacePanel({
  cards,
  selectedCardId,
  categoryId,
  categoryName,
  isRecycleBin,
  categories,
  onSelectCard,
  onAddCard,
  onUpdateCard,
  onMoveCard,
  onDeleteCard,
  onRestoreCard,
  onPermanentlyDeleteCard,
  onSearch,
  searchQuery
}: WorkspacePanelProps) {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [cardToMove, setCardToMove] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return cards.find(c => c.id === selectedCardId) || null;
  }, [selectedCardId, cards]);

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

  if (selectedCard) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <Button
            data-testid="button-back-to-cards"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => onSelectCard(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground">
            {categoryName}
          </span>
        </div>
        <CardEditor
          card={selectedCard}
          onUpdateCard={onUpdateCard}
          isRecycleBin={isRecycleBin}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{categoryName}</h2>
          {!isRecycleBin && (
            <Button
              data-testid="button-add-card"
              size="sm"
              onClick={onAddCard}
            >
              <Plus className="w-4 h-4 mr-1" />
              New Note
            </Button>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-cards"
            type="search"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => onSearch('')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-lg font-medium">
              {searchQuery ? 'No matching notes' : isRecycleBin ? 'Recycle bin is empty' : 'No notes yet'}
            </p>
            <p className="text-sm mt-1">
              {searchQuery ? 'Try a different search term' : isRecycleBin ? 'Deleted notes will appear here' : 'Create your first note to get started'}
            </p>
            {!isRecycleBin && !searchQuery && (
              <Button
                className="mt-4"
                onClick={onAddCard}
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Note
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map(card => (
              <ContextMenu key={card.id}>
                <ContextMenuTrigger asChild>
                  <div
                    data-testid={`card-item-${card.id}`}
                    className={cn(
                      "p-4 rounded-xl cursor-pointer transition-all border bg-card hover:shadow-md hover:border-primary/30",
                      "group"
                    )}
                    onClick={() => onSelectCard(card.id)}
                  >
                    <h3 className="text-base font-medium text-foreground truncate">
                      {card.title || 'Untitled'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3 min-h-[3.75rem]">
                      {getCardPreview(card)}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-3">
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
            ))}
          </div>
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