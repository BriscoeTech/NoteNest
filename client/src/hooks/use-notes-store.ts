import { useState, useEffect, useCallback } from 'react';
import type { Card, AppState, ContentBlock } from '@/lib/types';
import { get, set } from 'idb-keyval';
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

// Migration helpers (kept for potential legacy localstorage data if we want to migrate it once)
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
    if (card.parentId && categoryMap.has(card.parentId)) {
      const parent = categoryMap.get(card.parentId)!;
      parent.children.push(card);
    } else {
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

export function useNotesStore() {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from IDB (or localStorage fallack migration)
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try IDB first
        const saved = await get<string>(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.categories && Array.isArray(parsed.categories)) {
             console.log('Migrating legacy data...');
             const newCards = migrateLegacyData(parsed.categories, parsed.cards || []);
             setState({ cards: newCards });
          } else {
             setState({ cards: parsed.cards || [] });
          }
        } else {
           // Fallback: check localStorage for migration
           const localSaved = localStorage.getItem(STORAGE_KEY);
           if (localSaved) {
              console.log('Migrating from localStorage to IDB...');
              const parsed = JSON.parse(localSaved);
              let newCards: Card[] = [];
              if (parsed.categories) {
                 newCards = migrateLegacyData(parsed.categories, parsed.cards || []);
              } else {
                 newCards = parsed.cards || [];
              }
              setState({ cards: newCards });
              // Save to IDB immediately
              await set(STORAGE_KEY, JSON.stringify({ cards: newCards }));
           }
        }
      } catch (e) {
        console.error('Failed to load state:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  // Save state to IDB on change
  useEffect(() => {
    if (isLoaded) {
      set(STORAGE_KEY, JSON.stringify(state)).catch(err => console.error('Failed to save to IDB', err));
    }
  }, [state, isLoaded]);

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
        const len = ids.length;
        ids.forEach((id, index) => {
          const card = listMap.get(id);
          if (card) {
             // Update sortOrder to persist order
             // Existing sort is descending (b - a), so higher value is first/top.
             // We assign (len - index) to ensure first item has highest value.
             newList.push({ ...card, sortOrder: (Date.now() + (len - index)) }); 
             listMap.delete(id);
          }
        });
        // Append any remaining cards (shouldn't happen if ids is complete)
        // Give them lower sort order
        let remainingIndex = 1;
        listMap.forEach(card => {
           newList.push({ ...card, sortOrder: Date.now() - remainingIndex++ });
        });
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

  const moveCardStep = useCallback((cardId: string, direction: 'up' | 'down') => {
    setState(prev => {
      // Find the card and its parent
      const card = findCardById(prev.cards, cardId);
      if (!card) return prev;

      let siblings: Card[] = [];
      if (card.parentId) {
        const parent = findCardById(prev.cards, card.parentId);
        if (parent) siblings = parent.children;
      } else {
        siblings = prev.cards.filter(c => c.parentId === null);
      }

      // Filter non-deleted and sort descending (visual order)
      const sortedSiblings = siblings
        .filter(c => !c.isDeleted)
        .sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));

      const currentIndex = sortedSiblings.findIndex(c => c.id === cardId);
      if (currentIndex === -1) return prev;

      // Calculate new index
      let newIndex = currentIndex;
      if (direction === 'up') {
        newIndex = currentIndex - 1;
      } else {
        newIndex = currentIndex + 1;
      }

      // Check bounds
      if (newIndex < 0 || newIndex >= sortedSiblings.length) return prev;

      // Create new order of IDs
      const newOrderIds = [...sortedSiblings.map(c => c.id)];
      // Swap
      [newOrderIds[currentIndex], newOrderIds[newIndex]] = [newOrderIds[newIndex], newOrderIds[currentIndex]];

      // Re-use reorder logic
      // We need to re-apply this to the parent's children (or root)
      // Copy-paste reorder logic but internal to avoid state update collision? 
      // Actually we can just update the state directly here similar to reorderChildren
      
      const reorderList = (list: Card[], ids: string[]): Card[] => {
        const listMap = new Map(list.map(c => [c.id, c]));
        const newList: Card[] = [];
        const len = ids.length;
        const now = Date.now();
        ids.forEach((id, index) => {
          const c = listMap.get(id);
          if (c) {
             newList.push({ ...c, sortOrder: now + (len - index) }); 
             listMap.delete(id);
          }
        });
        listMap.forEach(c => newList.push(c));
        return newList;
      };

      if (card.parentId === null) {
         // Reorder root
         // We need to preserve deleted cards which were filtered out
         const deletedRoots = prev.cards.filter(c => c.parentId === null && c.isDeleted);
         // And reorder the visible ones
         const reorderedVisible = reorderList(sortedSiblings, newOrderIds);
         
         // Combine: We need to replace the root cards in prev.cards
         // easiest is to map prev.cards? No, prev.cards is the full tree.
         // Root cards are those in prev.cards with parentId === null.
         // We can reconstruct prev.cards.
         
         // Actually, prev.cards contains EVERYTHING if flattened? 
         // No, looking at structure: AppState { cards: Card[] }. 
         // And loadState/migrateLegacyData suggests it returns `rootCards`.
         // So `state.cards` is the LIST OF ROOT CARDS (which contain children recursively).
         
         // So for Root cards:
         const otherRoots = prev.cards.filter(c => c.id !== cardId && !newOrderIds.includes(c.id)); // Should be just deleted ones
         return {
            ...prev,
            cards: [...reorderedVisible, ...otherRoots]
         };
      } else {
        // Update parent
        const updateParent = (cards: Card[]): Card[] => {
          return cards.map(c => {
            if (c.id === card.parentId) {
               // Preserve deleted children
               const deletedChildren = c.children.filter(child => child.isDeleted);
               const reorderedVisible = reorderList(sortedSiblings, newOrderIds);
               return { ...c, children: [...reorderedVisible, ...deletedChildren] };
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

  const exportData = useCallback(() => {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      cards: state.cards
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = `notes-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    // Direct download is more reliable than Web Share API for "Export" functionality
    // especially ensuring it runs synchronously within the user gesture
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
    moveCardStep,
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
