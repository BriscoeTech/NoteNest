import { useState, useMemo, useCallback } from 'react';
import { useNotesStore } from '@/hooks/use-notes-store';
import { CategoryTree } from '@/components/CategoryTree';
import { WorkspacePanel } from '@/components/WorkspacePanel';
import { RECYCLE_BIN_ID, findCategoryById } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft } from 'lucide-react';

export default function NotesApp() {
  const store = useNotesStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
          c.title.toLowerCase().includes(lower)
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
    setSelectedCardId(null);
    setSearchQuery('');
  }, []);

  const handleSelectCard = useCallback((cardId: string, categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedCardId(cardId);
    setSearchQuery('');
  }, []);

  const handleAddCard = useCallback(() => {
    if (selectedCategoryId && selectedCategoryId !== RECYCLE_BIN_ID) {
      const newCardId = store.addCard(selectedCategoryId);
      setSelectedCardId(newCardId);
      return newCardId;
    }
    return undefined;
  }, [selectedCategoryId, store.addCard]);

  const handleAddCategory = useCallback((name: string, parentId: string | null) => {
    const newId = store.addCategory(name, parentId);
    setSelectedCategoryId(newId);
    setSelectedCardId(null);
  }, [store.addCategory]);

  const handleRenameCard = useCallback((cardId: string, title: string) => {
    store.updateCard(cardId, { title });
  }, [store.updateCard]);

  return (
    <div data-testid="notes-app" className="flex h-screen bg-background">
      {sidebarOpen && (
        <aside className="w-52 border-r border-border bg-sidebar flex-shrink-0">
          <CategoryTree
            categories={store.categories}
            cards={store.cards}
            selectedCategoryId={selectedCategoryId}
            selectedCardId={selectedCardId}
            onSelectCategory={handleSelectCategory}
            onSelectCard={handleSelectCard}
            onRenameCategory={store.renameCategory}
            onMoveCategory={store.moveCategory}
            onDeleteCategory={store.deleteCategory}
            onRenameCard={handleRenameCard}
            onMoveCard={store.moveCard}
            onDeleteCard={store.deleteCard}
            deletedCount={deletedCount}
            onExport={store.exportData}
            onImport={store.importData}
          />
        </aside>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-2 left-2 z-10 h-8 w-8"
        data-testid="toggle-sidebar"
      >
        {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
      </Button>

      <main className="flex-1 min-w-0">
        <WorkspacePanel
          cards={displayedCards}
          allCards={store.cards}
          categoryId={selectedCategoryId}
          categoryName={categoryName}
          isRecycleBin={isRecycleBin}
          hasCategories={hasCategories}
          categories={store.categories}
          currentCategory={currentCategory}
          selectedCardId={selectedCardId}
          onSelectCategory={handleSelectCategory}
          onSelectCard={setSelectedCardId}
          onAddCard={handleAddCard}
          onAddCategory={handleAddCategory}
          onUpdateCard={store.updateCard}
          onUpdateCardBlocks={store.updateCardBlocks}
          onMoveCard={store.moveCard}
          onDeleteCard={store.deleteCard}
          onRestoreCard={store.restoreCard}
          onPermanentlyDeleteCard={store.permanentlyDeleteCard}
          onReorderCard={store.reorderCard}
          onReorderCardsByIndex={store.reorderCardsByIndex}
          onReorderSubcategories={store.reorderSubcategories}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
        />
      </main>
    </div>
  );
}