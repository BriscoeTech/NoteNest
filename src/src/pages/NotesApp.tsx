import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNotesStore } from '@/hooks/use-notes-store';
import { CategoryTree } from '@/components/CategoryTree';
import { WorkspacePanel } from '@/components/WorkspacePanel';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import type { Card } from '@/lib/types';

import { RECYCLE_BIN_ID } from '@/lib/types';

export default function NotesApp() {
  const store = useNotesStore();
  const [currentCardId, setCurrentCardId] = useState<string | null>(null); // The scope we are in
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null); // The card selected in the tree (highlighted)
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const savedTheme = window.localStorage.getItem('notenest-theme');
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const isRecycleBin = selectedCardId === RECYCLE_BIN_ID;

  // Derived state
  const currentCard = useMemo(() => {
     if (isRecycleBin) return null;
     return store.getCard(currentCardId);
  }, [currentCardId, store.cards, isRecycleBin]); // store.cards dependency ensures update on change

  // Get children of current card (or root)
  const childrenCards = useMemo(() => {
    if (isRecycleBin) {
      const deleted = store.getDeletedCards();
      if (searchQuery) {
        const lower = searchQuery.toLowerCase();
        return deleted.filter(c => c.title.toLowerCase().includes(lower));
      }
      return deleted;
    }

    if (searchQuery) {
      return store.searchCards(searchQuery, currentCardId);
    }
    
    // Manual filtering from all cards
    if (currentCardId === null) {
      // Root cards
      return store.cards.filter(c => c.parentId === null && !c.isDeleted);
    } else {
      // Children of current card
      const card = store.getCard(currentCardId);
      return card ? card.children.filter((c: Card) => !c.isDeleted) : [];
    }
  }, [currentCardId, searchQuery, store.cards, isRecycleBin]);

  const handleNavigateCard = useCallback((id: string | null) => {
    setCurrentCardId(id);
    setSelectedCardId(id); // Sync selection in tree
    setSearchQuery('');
  }, []);

  const handleSelectCardInTree = useCallback((id: string | null) => {
    setSelectedCardId(id);
    if (id === RECYCLE_BIN_ID) {
      setCurrentCardId(null); // Recycle bin is a special root view
    } else {
      setCurrentCardId(id); // Also navigate to it? Yes, user said "clicking them will change the scope"
    }
    setSearchQuery('');
  }, []);

  const handleAddCard = useCallback((parentId: string | null) => {
    const newId = store.addCard('', parentId);
    return newId;
  }, [store.addCard]);

  const handleRenameCard = useCallback((id: string, title: string) => {
    store.updateCard(id, { title });
  }, [store.updateCard]);

  const deletedCount = store.getDeletedCards().length;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    window.localStorage.setItem('notenest-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <div data-testid="notes-app" className="flex h-screen bg-background">
      {sidebarOpen && (
        <aside className="w-52 border-r border-border bg-sidebar flex-shrink-0 flex flex-col">
          <CategoryTree
            className="flex-1 min-h-0"
            cards={store.cards}
            selectedCardId={selectedCardId}
            onSelectCard={handleSelectCardInTree}
            onRenameCard={handleRenameCard}
            onMoveCard={store.moveCard}
            onReorderCard={store.moveCardStep}
            onDeleteCard={store.deleteCard}
            onUpdateCardBlocks={store.updateCardBlocks}
            deletedCount={deletedCount}
            onExport={store.exportData}
            onImport={store.importData}
            onSearch={setSearchQuery}
            searchQuery={searchQuery}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
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

      <main className="flex-1 min-w-0 relative">
        <WorkspacePanel
          currentCard={currentCard || null}
          childrenCards={childrenCards}
          allCards={store.cards}
          isRecycleBin={isRecycleBin}
          onNavigateCard={handleNavigateCard}
          onAddCard={handleAddCard}
          onUpdateCard={store.updateCard}

          onUpdateCardBlocks={store.updateCardBlocks}
          onMoveCard={store.moveCard}
          onDeleteCard={store.deleteCard}
          onRestoreCard={store.restoreCard}
          onPermanentlyDeleteCard={store.permanentlyDeleteCard}
          onReorderCard={store.moveCardStep}
          onReorderCardsByIndex={(ids) => store.reorderChildren(currentCardId, ids)}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
          sidebarOpen={sidebarOpen}
        />
      </main>
    </div>
  );
}
