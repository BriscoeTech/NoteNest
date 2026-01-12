import { useState } from 'react';
import { Plus, Search, X, Folder } from 'lucide-react';
import type { Card, Category } from '@/lib/types';
import { RECYCLE_BIN_ID } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategoryPickerDialog } from './CategoryPickerDialog';
import { InlineCardEditor } from './InlineCardEditor';

interface WorkspacePanelProps {
  cards: Card[];
  categoryId: string | null;
  categoryName: string;
  isRecycleBin: boolean;
  hasCategories: boolean;
  categories: Category[];
  onAddCard: () => void;
  onUpdateCard: (id: string, updates: Partial<Card>) => void;
  onMoveCard: (cardId: string, categoryId: string) => void;
  onDeleteCard: (id: string) => void;
  onRestoreCard: (id: string, categoryId: string) => void;
  onPermanentlyDeleteCard: (id: string) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  onCreateCategory: () => void;
}

export function WorkspacePanel({
  cards,
  categoryId,
  categoryName,
  isRecycleBin,
  hasCategories,
  categories,
  onAddCard,
  onUpdateCard,
  onMoveCard,
  onDeleteCard,
  onRestoreCard,
  onPermanentlyDeleteCard,
  onSearch,
  searchQuery,
  onCreateCategory
}: WorkspacePanelProps) {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
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
    if (cardToMove && targetCategoryId) {
      if (isRestoring) {
        onRestoreCard(cardToMove, targetCategoryId);
      } else {
        onMoveCard(cardToMove, targetCategoryId);
      }
    }
    setMoveDialogOpen(false);
    setCardToMove(null);
  };

  const toggleCardExpand = (cardId: string) => {
    setExpandedCardId(prev => prev === cardId ? null : cardId);
  };

  const isValidCategory = categoryId && categoryId !== RECYCLE_BIN_ID;

  if (!categoryId) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center p-8">
        <div className="text-center max-w-md">
          <Folder className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {hasCategories ? 'Select a Category' : 'Create Your First Category'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {hasCategories 
              ? 'Choose a category from the sidebar to view and create notes.'
              : 'Notes must belong to a category. Create one to get started.'}
          </p>
          {!hasCategories && (
            <Button onClick={onCreateCategory}>
              <Plus className="w-4 h-4 mr-2" />
              Create Category
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{categoryName}</h2>
          {isValidCategory && (
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
            placeholder="Search in this category..."
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
              {searchQuery 
                ? 'Try a different search term' 
                : isRecycleBin 
                  ? 'Deleted notes will appear here' 
                  : 'Create your first note to get started'}
            </p>
            {isValidCategory && !searchQuery && (
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
          <div className="space-y-3 max-w-3xl mx-auto">
            {cards.map(card => (
              <InlineCardEditor
                key={card.id}
                card={card}
                isExpanded={expandedCardId === card.id}
                isRecycleBin={isRecycleBin}
                onToggleExpand={() => toggleCardExpand(card.id)}
                onUpdateCard={onUpdateCard}
                onMoveCard={handleMoveClick}
                onDeleteCard={onDeleteCard}
                onRestoreCard={handleRestoreClick}
                onPermanentlyDeleteCard={onPermanentlyDeleteCard}
              />
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
        showRoot={false}
      />
    </div>
  );
}