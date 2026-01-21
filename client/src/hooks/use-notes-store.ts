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

  const updateCardBlocks = useCallback((id: string, blocks: ContentBlock[]) => {
    setState(prev => ({
      ...prev,
      cards: updateCardInTree(prev.cards, id, { blocks })
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

  const reorderChildren = useCallback((parentId: string | null, childIds: string[]) => {
    setState(prev => {
      // Helper to reorder a list based on IDs
      const reorderList = (list: Card[], ids: string[]): Card[] => {
        const listMap = new Map(list.map(c => [c.id, c]));
        const newList: Card[] = [];
        // Add cards in the order of ids
        ids.forEach((id, index) => {
          const card = listMap.get(id);
          if (card) {
             // Update sortOrder to persist order
             newList.push({ ...card, sortOrder: index }); 
             listMap.delete(id);
          }
        });
        // Append any remaining cards (shouldn't happen if ids is complete)
        listMap.forEach(card => newList.push(card));
        return newList;
      };

      if (parentId === null) {
        const newRoot = reorderList(prev.cards, childIds);
        return { ...prev, cards: newRoot };
      } else {
        // Find parent and update its children
        const updateParent = (cards: Card[]): Card[] => {
          return cards.map(c => {
            if (c.id === parentId) {
              return { ...c, children: reorderList(c.children, childIds) };
            }
            return { ...c, children: updateParent(c.children) };
          });
        };
        return { ...prev, cards: updateParent(prev.cards) };
      }
    });
  }, []);

  const deleteCard = useCallback((id: string) => {
    setState(prev => {
      // Recursive delete mark
      const markDeleted = (cards: Card[]): Card[] => {
        return cards.map(c => {
          if (c.id === id) {
            const markAllDeleted = (cards: Card[]): Card[] => {
              return cards.map(c => ({ 
                ...c, 
                isDeleted: true, 
                updatedAt: Date.now(), 
                children: markAllDeleted(c.children) 
              }));
            };
            return { ...c, isDeleted: true, updatedAt: Date.now(), children: markAllDeleted(c.children) };
          }
          return { ...c, children: markDeleted(c.children) };
        });
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
      const card = findCardById(prev.cards, id);
      if (!card) return prev;

      const restoreSubtree = (c: Card): Card => ({
        ...c,
        isDeleted: false,
        children: c.children.map(restoreSubtree)
      });
      
      const fullyRestoredCard = restoreSubtree({ ...card, isDeleted: false, updatedAt: Date.now() });
      
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
      if (root) scopeCards = [root]; 
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
      setState(prev => {
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
    updateCardBlocks,
    moveCard,
    reorderChildren,
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
