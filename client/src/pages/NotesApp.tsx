import { useState, useMemo } from 'react';
import { useNotesStore } from '@/hooks/use-notes-store';
import { CategoryTree } from '@/components/CategoryTree';
import { WorkspacePanel } from '@/components/WorkspacePanel';
import { ALL_NOTES_ID, RECYCLE_BIN_ID, findCategoryById } from '@/lib/types';

export default function NotesApp() {
  const store = useNotesStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(ALL_NOTES_ID);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isRecycleBin = selectedCategoryId === RECYCLE_BIN_ID;
  const isAllNotes = selectedCategoryId === ALL_NOTES_ID;

  const categoryName = useMemo(() => {
    if (isRecycleBin) return 'Recycle Bin';
    if (isAllNotes) return 'All Notes';
    if (selectedCategoryId) {
      const cat = findCategoryById(store.categories, selectedCategoryId);
      return cat?.name || 'Unknown';
    }
    return 'Uncategorized';
  }, [selectedCategoryId, store.categories, isRecycleBin, isAllNotes]);

  const displayedCards = useMemo(() => {
    if (isRecycleBin) {
      const deleted = store.getDeletedCards();
      if (searchQuery) {
        const lower = searchQuery.toLowerCase();
        return deleted.filter(c => 
          c.title.toLowerCase().includes(lower) ||
          c.content.toLowerCase().includes(lower)
        );
      }
      return deleted;
    }

    if (searchQuery) {
      return store.searchCards(searchQuery, isAllNotes ? null : selectedCategoryId);
    }

    if (isAllNotes) {
      return store.cards.filter(c => !c.isDeleted);
    }

    return store.getCardsForCategory(selectedCategoryId);
  }, [
    selectedCategoryId, 
    searchQuery, 
    store.cards, 
    isRecycleBin, 
    isAllNotes,
    store.getDeletedCards,
    store.searchCards,
    store.getCardsForCategory
  ]);

  const deletedCount = store.getDeletedCards().length;

  const handleSelectCategory = (id: string | null) => {
    setSelectedCategoryId(id);
    setSelectedCardId(null);
    setSearchQuery('');
  };

  const handleAddCard = () => {
    const categoryId = isAllNotes || isRecycleBin ? null : selectedCategoryId;
    const newCardId = store.addCard(categoryId);
    setSelectedCardId(newCardId);
  };

  const handleSelectCard = (id: string | null) => {
    setSelectedCardId(id);
  };

  return (
    <div data-testid="notes-app" className="flex h-screen bg-background">
      <aside className="w-64 border-r border-border bg-sidebar flex-shrink-0">
        <CategoryTree
          categories={store.categories}
          selectedId={selectedCategoryId}
          onSelect={handleSelectCategory}
          onAddCategory={store.addCategory}
          onRenameCategory={store.renameCategory}
          onMoveCategory={store.moveCategory}
          onDeleteCategory={store.deleteCategory}
          deletedCount={deletedCount}
        />
      </aside>

      <main className="flex-1 min-w-0">
        <WorkspacePanel
          cards={displayedCards}
          selectedCardId={selectedCardId}
          categoryId={selectedCategoryId}
          categoryName={categoryName}
          isRecycleBin={isRecycleBin}
          categories={store.categories}
          onSelectCard={handleSelectCard}
          onAddCard={handleAddCard}
          onUpdateCard={store.updateCard}
          onMoveCard={store.moveCard}
          onDeleteCard={store.deleteCard}
          onRestoreCard={store.restoreCard}
          onPermanentlyDeleteCard={store.permanentlyDeleteCard}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
        />
      </main>
    </div>
  );
}