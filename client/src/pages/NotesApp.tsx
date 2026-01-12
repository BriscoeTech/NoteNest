import { useState, useMemo } from 'react';
import { useNotesStore } from '@/hooks/use-notes-store';
import { CategoryTree } from '@/components/CategoryTree';
import { CardList } from '@/components/CardList';
import { CardEditor } from '@/components/CardEditor';
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

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return store.cards.find(c => c.id === selectedCardId) || null;
  }, [selectedCardId, store.cards]);

  const deletedCount = store.getDeletedCards().length;

  const handleSelectCategory = (id: string | null) => {
    setSelectedCategoryId(id);
    setSelectedCardId(null);
    setSearchQuery('');
  };

  const handleAddCard = () => {
    const categoryId = isAllNotes ? null : selectedCategoryId;
    const newCardId = store.addCard(categoryId);
    setSelectedCardId(newCardId);
  };

  const handleSelectCard = (id: string) => {
    setSelectedCardId(id);
  };

  return (
    <div data-testid="notes-app" className="flex h-screen bg-background">
      <aside className="w-60 border-r border-border bg-sidebar flex-shrink-0">
        <CategoryTree
          categories={store.categories}
          selectedId={selectedCategoryId}
          onSelect={handleSelectCategory}
          onAddCategory={store.addCategory}
          onRenameCategory={store.renameCategory}
          onDeleteCategory={store.deleteCategory}
          deletedCount={deletedCount}
        />
      </aside>

      <div className="w-72 flex-shrink-0">
        <CardList
          cards={displayedCards}
          selectedCardId={selectedCardId}
          categoryId={selectedCategoryId}
          categoryName={categoryName}
          isRecycleBin={isRecycleBin}
          categories={store.categories}
          onSelectCard={handleSelectCard}
          onAddCard={handleAddCard}
          onMoveCard={store.moveCard}
          onDeleteCard={store.deleteCard}
          onRestoreCard={store.restoreCard}
          onPermanentlyDeleteCard={store.permanentlyDeleteCard}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
        />
      </div>

      <CardEditor
        card={selectedCard}
        onUpdateCard={store.updateCard}
        isRecycleBin={isRecycleBin}
      />
    </div>
  );
}