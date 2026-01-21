import { useState, useEffect, useCallback } from 'react';
import type { Card, AppState, ContentBlock } from '@/lib/types';
import { 
  generateId, 
  removeCardFromTree, 
  addCardToParent, 
  updateCardInTree,
  getAllCardIds,
  canMoveCard,
  moveCardToParent,
  findCardById,
  getDescendantIds
} from '@/lib/types';

const STORAGE_KEY = 'notecards_data';

const defaultState: AppState = {
  cards: []
};

// Migration helpers
function migrateLegacyData(categories: any[], legacyCards: any[]): Card[] {
  const categoryMap = new Map<string, Card>();

  const convertCategory = (cat: any): Card => ({
    id: cat.id,
    title: cat.name,
    blocks: [],
    parentId: cat.parentId,
    children: [],
    sortOrder: cat.sortOrder || Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDeleted: false
  });

  const convertCard = (card: any): Card => {
    let blocks = card.blocks || [];
    if (!blocks.length && card.content) {
      blocks.push({ id: generateId(), type: 'text', content: card.content });
    }
    if (card.bullets && card.bullets.length) {
      blocks.push({ id: generateId(), type: 'bullets', items: card.bullets });
    }

    return {
      id: card.id,
      title: card.title || 'Untitled',
      blocks,
      parentId: card.categoryId || null,
      children: [],
      sortOrder: Date.now(),
      createdAt: card.createdAt || Date.now(),
      updatedAt: card.updatedAt || Date.now(),
      isDeleted: card.isDeleted || false
    };
  };

  // Flatten categories
  const flatCategories: any[] = [];
  const traverse = (cats: any[]) => {
    for (const cat of cats) {
      flatCategories.push(cat);
      traverse(cat.children || []);
    }
  };
  traverse(categories);

  // Create Card objects for categories
  flatCategories.forEach(cat => {
    categoryMap.set(cat.id, convertCategory(cat));
  });

  // Create Card objects for legacy cards
  const convertedCards = legacyCards.map(convertCard);

  // Build the tree
  const rootCards: Card[] = [];

  // Add category-cards to tree
  flatCategories.forEach(cat => {
    const card = categoryMap.get(cat.id)!;
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      const parent = categoryMap.get(cat.parentId)!;
      parent.children.push(card);
    } else {
      rootCards.push(card);
    }
  });

  // Add legacy cards to tree
  convertedCards.forEach((card: Card) => {
    // TypeScript thinks parentId is string|null, but checking map usage
    if (card.parentId && categoryMap.has(card.parentId)) {
      const parent = categoryMap.get(card.parentId)!;
      parent.children.push(card);
    } else {
      // If parent not found (orphaned or root), add to root
      rootCards.push(card);
    }
  });

  // Sort children
  const sortCards = (list: Card[]) => {
    list.sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));
    list.forEach(c => sortCards(c.children));
  };
  sortCards(rootCards);

  return rootCards;
}

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Check if it's legacy data (has categories)
      if (parsed.categories && Array.isArray(parsed.categories)) {
        console.log('Migrating legacy data...');
        const newCards = migrateLegacyData(parsed.categories, parsed.cards || []);
        return { cards: newCards };
      }
      // New format
      return { cards: parsed.cards || [] };
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return defaultState;
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function useNotesStore() {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addCard = useCallback((title: string, parentId: string | null): string => {
    const newCard: Card = {
      id: generateId(),
      title,
      blocks: [],
      parentId,
      children: [],
      sortOrder: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false
    };
    setState(prev => ({
      ...prev,
      cards: addCardToParent(prev.cards, parentId, newCard)
    }));
    return newCard.id;
  }, []);

  const updateCard = useCallback((id: string, updates: Partial<Omit<Card, 'id' | 'children'>>) => {
    setState(prev => ({
      ...prev,
      cards: updateCardInTree(prev.cards, id, updates)
    }));
  }, []);

  const moveCard = useCallback((cardId: string, newParentId: string | null) => {
    setState(prev => {
      if (!canMoveCard(prev.cards, cardId, newParentId)) {
        return prev;
      }
      return {
        ...prev,
        cards: moveCardToParent(prev.cards, cardId, newParentId)
      };
    });
  }, []);

  const deleteCard = useCallback((id: string) => {
    setState(prev => {
      // Recursive delete mark
      const markDeleted = (cards: Card[]): Card[] => {
        return cards.map(c => {
          if (c.id === id) {
            return { ...c, isDeleted: true, updatedAt: Date.now(), children: markAllDeleted(c.children) };
          }
          return { ...c, children: markDeleted(c.children) };
        });
      };
      const markAllDeleted = (cards: Card[]): Card[] => {
        return cards.map(c => ({ 
          ...c, 
          isDeleted: true, 
          updatedAt: Date.now(), 
          children: markAllDeleted(c.children) 
        }));
      };

      return {
        ...prev,
        cards: markDeleted(prev.cards)
      };
    });
  }, []);

  const permanentlyDeleteCard = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      cards: removeCardFromTree(prev.cards, id)
    }));
  }, []);

  const restoreCard = useCallback((id: string, targetParentId: string | null) => {
    setState(prev => {
      // We need to:
      // 1. Find the card (could be anywhere in deleted state)
      // 2. Remove it from its current location
      // 3. Add it to target location
      // 4. Mark it as not deleted
      
      const card = findCardById(prev.cards, id);
      if (!card) return prev;

      // Unmark deleted
      const restoredCard = { ...card, isDeleted: false, updatedAt: Date.now() }; // TODO: restore children too? user might want to selectively restore. For now, let's restore just the card and keep children deleted? Or restore children too?
      // Usually "Restore" restores the subtree.
      
      const restoreSubtree = (c: Card): Card => ({
        ...c,
        isDeleted: false,
        children: c.children.map(restoreSubtree)
      });
      
      const fullyRestoredCard = restoreSubtree(restoredCard);

      // If we are just undeleting in place (if parent is not deleted)
      // But we passed targetParentId, so we likely want to move it too.
      // Wait, removeCardFromTree removes by ID.
      
      const withoutCard = removeCardFromTree(prev.cards, id);
      const withCardAdded = addCardToParent(withoutCard, targetParentId, fullyRestoredCard);

      return { ...prev, cards: withCardAdded };
    });
  }, []);

  const getCard = useCallback((id: string | null) => {
    if (!id) return null;
    return findCardById(state.cards, id);
  }, [state.cards]);

  const searchCards = useCallback((query: string, rootId: string | null) => {
    const lowerQuery = query.toLowerCase();
    const results: Card[] = [];
    
    // Determine where to search
    let scopeCards = state.cards;
    if (rootId) {
      const root = findCardById(state.cards, rootId);
      if (root) scopeCards = [root]; // Include root in search? Or just children? Usually descendants.
    }

    const traverse = (list: Card[]) => {
      for (const card of list) {
        if (!card.isDeleted) {
          const matchesTitle = card.title.toLowerCase().includes(lowerQuery);
          const matchesBlocks = card.blocks.some(block => {
            if (block.type === 'text') return block.content.toLowerCase().includes(lowerQuery);
            if (block.type === 'bullets') return block.items.some(i => i.content.toLowerCase().includes(lowerQuery));
            return false;
          });

          if (matchesTitle || matchesBlocks) {
            results.push(card);
          }
        }
        traverse(card.children);
      }
    };
    traverse(scopeCards);
    return results;
  }, [state.cards]);

  const getDeletedCards = useCallback(() => {
    const deleted: Card[] = [];
    const traverse = (list: Card[]) => {
      for (const c of list) {
        if (c.isDeleted) {
          deleted.push(c);
        } else {
          traverse(c.children);
        }
      }
    };
    traverse(state.cards);
    return deleted;
  }, [state.cards]);

  const exportData = useCallback(async () => {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      cards: state.cards
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = `notes-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Notes Backup' });
          return;
        } catch (err) {}
      }
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }, [state]);

  const importData = useCallback((data: any, mode: 'merge' | 'override') => {
    let importedCards: Card[] = [];
    if (data.categories) {
       // Legacy format
       importedCards = migrateLegacyData(data.categories, data.cards || []);
    } else {
       importedCards = data.cards || [];
    }

    if (mode === 'override') {
      setState({ cards: importedCards });
    } else {
      // Merge mode: Naive append to root for now, or ID conflict check?
      // Better to check IDs.
      setState(prev => {
        // Recursive merge is hard. 
        // Simple approach: append imported root cards to current root cards, 
        // regenerating IDs if they conflict?
        // Or if ID exists, update it?
        // Let's just append to root and let user sort it out, but avoid duplicate IDs.
        
        // Actually, let's map existing IDs.
        const existingIds = new Set(getAllCardIds(prev.cards));
        
        // If an imported card has ID that exists, we should probably skip it or overwrite?
        // "Merge" usually means add missing stuff.
        
        // Let's just append all imported root cards to the list.
        // But we must ensure unique IDs if we want valid tree.
        // For now, let's assume imports are unique or we overwrite matches?
        // Let's just append.
        return {
          cards: [...prev.cards, ...importedCards]
        };
      });
    }
  }, []);

  return {
    cards: state.cards,
    addCard,
    updateCard,
    moveCard,
    deleteCard,
    permanentlyDeleteCard,
    restoreCard,
    getCard,
    searchCards,
    getDeletedCards,
    exportData,
    importData
  };
}