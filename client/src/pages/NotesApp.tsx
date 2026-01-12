import { useState, useMemo, useCallback } from 'react';
import { useNotesStore } from '@/hooks/use-notes-store';
import { CategoryTree } from '@/components/CategoryTree';
import { WorkspacePanel } from '@/components/WorkspacePanel';
import { RECYCLE_BIN_ID, findCategoryById } from '@/lib/types';

export default function NotesApp() {
  const store = useNotesStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isRecycleBin = selectedCategoryId === RECYCLE_BIN_ID;

  const currentCategory = useMemo(() => {
    if (!selectedCategoryId || isRecycleBin) return null;
    return findCategoryById(store.categories, selectedCategoryId);
  }, [selectedCategoryId, store.categories, isRecycleBin]);

  const categoryName = useMemo(() => {
    if (isRecycleBin) return 'Recycle Bin';
    if (currentCategory) return currentCategory.name;
    return '';
  }, [isRecycleBin, currentCategory]);

  const displayedCards = useMemo(() => {
    if (!selectedCategoryId) return [];
    
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
      return store.searchCards(searchQuery, selectedCategoryId);
    }

    return store.getCardsForCategory(selectedCategoryId);
  }, [
    selectedCategoryId, 
    searchQuery, 
    store.cards, 
    isRecycleBin,
    store.getDeletedCards,
    store.searchCards,
    store.getCardsForCategory
  ]);

  const deletedCount = store.getDeletedCards().length;
  const hasCategories = store.categories.length > 0;

  const handleSelectCategory = useCallback((id: string | null) => {
    setSelectedCategoryId(id);
    setSearchQuery('');
  }, []);

  const handleAddCard = useCallback(() => {
    if (selectedCategoryId && selectedCategoryId !== RECYCLE_BIN_ID) {
      store.addCard(selectedCategoryId);
    }
  }, [selectedCategoryId, store.addCard]);

  const handleAddCategory = useCallback((name: string, parentId: string | null) => {
    const newId = store.addCategory(name, parentId);
    setSelectedCategoryId(newId);
  }, [store.addCategory]);

  return (
    <div data-testid="notes-app" className="flex h-screen bg-background">
      <aside className="w-56 border-r border-border bg-sidebar flex-shrink-0">
        <CategoryTree
          categories={store.categories}
          selectedId={selectedCategoryId}
          onSelect={handleSelectCategory}
          onRenameCategory={store.renameCategory}
          onMoveCategory={store.moveCategory}
          onDeleteCategory={store.deleteCategory}
          deletedCount={deletedCount}
        />
      </aside>

      <main className="flex-1 min-w-0">
        <WorkspacePanel
          cards={displayedCards}
          categoryId={selectedCategoryId}
          categoryName={categoryName}
          isRecycleBin={isRecycleBin}
          hasCategories={hasCategories}
          categories={store.categories}
          currentCategory={currentCategory}
          onSelectCategory={handleSelectCategory}
          onAddCard={handleAddCard}
          onAddCategory={handleAddCategory}
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