import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNotesStore } from '@/hooks/use-notes-store';
import { CategoryTree } from '@/components/CategoryTree';
import { WorkspacePanel } from '@/components/WorkspacePanel';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import type { Card, CardType } from '@/lib/types';

import { RECYCLE_BIN_ID } from '@/lib/types';

const TREE_SCOPE_STORAGE_KEY = 'notenest-tree-scope';
const TREE_SELECTION_STORAGE_KEY = 'notenest-tree-selection';
const TREE_SEARCH_STORAGE_KEY = 'notenest-tree-search';
const TREE_SIDEBAR_OPEN_STORAGE_KEY = 'notenest-tree-sidebar-open';

export default function NotesApp() {
  const store = useNotesStore();
  const [currentCardId, setCurrentCardId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TREE_SCOPE_STORAGE_KEY);
  }); // The scope we are in
  const [selectedCardId, setSelectedCardId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TREE_SELECTION_STORAGE_KEY);
  }); // The card selected in the tree (highlighted)
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(TREE_SEARCH_STORAGE_KEY) || '';
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem(TREE_SIDEBAR_OPEN_STORAGE_KEY);
    if (saved === null) return true;
    return saved === 'true';
  });
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
      const collectDeletedRoots = (cards: Card[], parentDeleted = false): Card[] => {
        const roots: Card[] = [];
        for (const card of cards) {
          if (card.isDeleted && !parentDeleted) {
            roots.push(card);
          }
          roots.push(...collectDeletedRoots(card.children, parentDeleted || card.isDeleted));
        }
        return roots;
      };

      const filterDeletedTree = (cards: Card[], lower: string): Card[] => {
        const filtered: Card[] = [];
        for (const card of cards) {
          const filteredChildren = filterDeletedTree(card.children.filter(c => c.isDeleted), lower);
          const matches = card.title.toLowerCase().includes(lower);
          if (matches || filteredChildren.length > 0) {
            filtered.push({ ...card, children: filteredChildren });
          }
        }
        return filtered;
      };

      const deletedRoots = collectDeletedRoots(store.cards);
      if (searchQuery) {
        const lower = searchQuery.toLowerCase();
        return filterDeletedTree(deletedRoots, lower);
      }
      return deletedRoots;
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

  const handleAddCard = useCallback((parentId: string | null, cardType: CardType = 'note') => {
    const newId = store.addCard('', parentId, cardType);
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!store.isLoaded) return;

    const validIds = new Set<string>();
    const collectIds = (cards: Card[]) => {
      for (const card of cards) {
        validIds.add(card.id);
        collectIds(card.children);
      }
    };
    collectIds(store.cards);

    setSelectedCardId((prev) => {
      if (prev === null) return prev;
      if (prev === RECYCLE_BIN_ID || validIds.has(prev)) return prev;
      return null;
    });

    setCurrentCardId((prev) => {
      if (prev === null) return prev;
      if (validIds.has(prev)) return prev;
      return null;
    });
  }, [store.cards, store.isLoaded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedCardId === null) {
      window.localStorage.removeItem(TREE_SELECTION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(TREE_SELECTION_STORAGE_KEY, selectedCardId);
  }, [selectedCardId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentCardId === null) {
      window.localStorage.removeItem(TREE_SCOPE_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(TREE_SCOPE_STORAGE_KEY, currentCardId);
  }, [currentCardId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TREE_SEARCH_STORAGE_KEY, searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TREE_SIDEBAR_OPEN_STORAGE_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  return (
    <div data-testid="notes-app" className="flex h-screen bg-background">
      {sidebarOpen && (
        <aside className="w-52 border-r border-border bg-sidebar flex-shrink-0 flex flex-col">
          <CategoryTree
            className="flex-1 min-h-0"
            cards={store.cards}
            isLoaded={store.isLoaded}
            selectedCardId={selectedCardId}
            onSelectCard={handleSelectCardInTree}
            onAddCard={handleAddCard}
            onRenameCard={handleRenameCard}
            onMoveCard={store.moveCard}
            onInsertCardRelative={store.reorderCardRelative}
            onReorderCard={store.moveCardStep}
            onDeleteCard={store.deleteCard}
            onUpdateCard={store.updateCard}
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
          onEmptyRecycleBin={store.emptyRecycleBin}
          onReorderCard={store.moveCardStep}
          onReorderChildren={store.reorderChildren}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
          sidebarOpen={sidebarOpen}
        />
      </main>
    </div>
  );
}
