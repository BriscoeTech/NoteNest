import { useState, useEffect, useCallback } from 'react';
import type { Card, AppState, ContentBlock, CardType, TodoCardItem, TodoList } from '@/lib/types';
import { blockMatchesSearch } from '@/lib/block-types';
import {
  buildExportBackup,
  createExportFilename,
  getImportCards,
  normalizeCardTree,
  stringifyExportBackup,
} from '@/lib/import-export';
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
import { RUNTIME_VERSION_DISPLAY, ensureAppVersionLoaded } from '@/lib/app-version';

const STORAGE_KEY = 'notecards_data';
const TODO_LIST_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ca8a04', '#0891b2', '#475569', '#4f46e5', '#ffffff', '#000000'];

const defaultState: AppState = {
  cards: [],
};

function getTodoListColor(index: number): string {
  return TODO_LIST_COLORS[index % TODO_LIST_COLORS.length];
}

function sortCardsByVisualOrder(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));
}

function collectTodoCheckboxItems(listCard: Card): TodoCardItem[] {
  const items: TodoCardItem[] = [];
  const visit = (cards: Card[]) => {
    for (const card of sortCardsByVisualOrder(cards.filter((candidate) => !candidate.isDeleted))) {
      if (card.cardType === 'checkbox') {
        items.push({ id: card.id, type: 'card', cardId: card.id });
      }
      visit(card.children);
    }
  };
  visit(listCard.children);
  return items;
}

function getTodoListsFromCards(cards: Card[]): TodoList[] {
  const lists: TodoList[] = [];
  const visit = (items: Card[]) => {
    for (const card of items) {
      if (!card.isDeleted && card.cardType === 'list') {
        lists.push({
          id: card.id,
          title: card.title || 'Untitled',
          color: card.todoListColor || getTodoListColor(lists.length),
          items: collectTodoCheckboxItems(card),
        });
      }
      visit(card.children);
    }
  };
  visit(cards);
  return lists.sort((a, b) => {
    const cardA = findCardById(cards, a.id);
    const cardB = findCardById(cards, b.id);
    return (cardB?.todoListOrder ?? cardB?.sortOrder ?? 0) - (cardA?.todoListOrder ?? cardA?.sortOrder ?? 0);
  });
}

function updateCardTree(cards: Card[], id: string, updater: (card: Card) => Card): Card[] {
  return cards.map((card) => {
    if (card.id === id) return updater(card);
    return { ...card, children: updateCardTree(card.children, id, updater) };
  });
}

function moveCardRelativeInTree(cards: Card[], cardId: string, targetId: string, position: 'before' | 'after'): Card[] {
  const targetCard = findCardById(cards, targetId);
  if (!targetCard || cardId === targetId || !canMoveCard(cards, cardId, targetCard.parentId)) return cards;

  let detachedCard: Card | null = null;
  const targetParentId = targetCard.parentId;
  const detachCard = (items: Card[]): Card[] => {
    const next: Card[] = [];
    for (const card of items) {
      if (card.id === cardId) {
        detachedCard = { ...card, parentId: targetParentId, updatedAt: Date.now() };
        continue;
      }
      next.push({ ...card, children: detachCard(card.children) });
    }
    return next;
  };

  const withoutCard = detachCard(cards);
  if (!detachedCard) return cards;
  const movedCard = detachedCard;
  const now = Date.now();

  const insertIntoList = (items: Card[]): Card[] => {
    const targetIndex = items.findIndex((card) => card.id === targetId);
    if (targetIndex === -1) return items;
    const next = [...items];
    next.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, movedCard);
    const len = next.length;
    return next.map((card, index) => ({
      ...card,
      parentId: targetParentId,
      sortOrder: now + (len - index),
    }));
  };

  if (targetParentId === null) {
    return insertIntoList(withoutCard);
  }

  return withoutCard.map((card) => {
    if (card.id === targetParentId) {
      return { ...card, children: insertIntoList(card.children) };
    }
    return { ...card, children: updateCardTree(card.children, targetParentId, (parent) => ({ ...parent, children: insertIntoList(parent.children) })) };
  });
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
             const newCards = getImportCards(parsed);
             setState({ cards: newCards });
          } else {
             const cards = normalizeCardTree(parsed.cards || []);
             setState({ cards });
          }
        } else {
           // Fallback: check localStorage for migration
           const localSaved = localStorage.getItem(STORAGE_KEY);
           if (localSaved) {
              console.log('Migrating from localStorage to IDB...');
              const parsed = JSON.parse(localSaved);
              const newCards = getImportCards(parsed);
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

  const addCard = useCallback((title: string, parentId: string | null, cardType: CardType = 'note'): string => {
    const newCard: Card = {
      id: generateId(),
      title,
      cardType,
      backgroundColor: null,
      textColor: null,
      textColorHsv: null,
      blocks: [],
      isTodoList: false,
      todoListColor: null,
      todoListOrder: null,
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

  const reorderCardRelative = useCallback((cardId: string, targetId: string, position: 'before' | 'after') => {
    setState(prev => {
      const movingCard = findCardById(prev.cards, cardId);
      const targetCard = findCardById(prev.cards, targetId);
      if (!movingCard || !targetCard || movingCard.id === targetCard.id) return prev;

      const targetParentId = targetCard.parentId;
      if (!canMoveCard(prev.cards, cardId, targetParentId)) {
        return prev;
      }

      let detachedCard: Card | null = null;
      const detachCard = (cards: Card[]): Card[] => {
        const next: Card[] = [];
        for (const card of cards) {
          if (card.id === cardId) {
            detachedCard = { ...card, parentId: targetParentId, updatedAt: Date.now() };
            continue;
          }
          next.push({ ...card, children: detachCard(card.children) });
        }
        return next;
      };

      const withoutCard = detachCard(prev.cards);
      if (!detachedCard) return prev;
      const movedCard = detachedCard;

      const insertIntoList = (list: Card[]): Card[] => {
        const targetIndex = list.findIndex(card => card.id === targetId);
        if (targetIndex === -1) return list;
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        const next = [...list];
        next.splice(insertIndex, 0, movedCard);
        const now = Date.now();
        const len = next.length;
        return next.map((card, index) => ({
          ...card,
          parentId: targetParentId,
          sortOrder: now + (len - index),
        }));
      };

      if (targetParentId === null) {
        return { ...prev, cards: insertIntoList(withoutCard) };
      }

      const updateParentChildren = (cards: Card[]): Card[] =>
        cards.map(card => {
          if (card.id === targetParentId) {
            return { ...card, children: insertIntoList(card.children) };
          }
          return { ...card, children: updateParentChildren(card.children) };
        });

      return { ...prev, cards: updateParentChildren(withoutCard) };
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
        cards: markDeleted(prev.cards),
      };
    });
  }, []);

  const permanentlyDeleteCard = useCallback((id: string) => {
    setState(prev => {
      const cards = removeCardFromTree(prev.cards, id);
      return {
        ...prev,
        cards,
      };
    });
  }, []);

  const emptyRecycleBin = useCallback(() => {
    const removeDeleted = (cards: Card[]): Card[] =>
      cards
        .filter(c => !c.isDeleted)
        .map(c => ({
          ...c,
          children: removeDeleted(c.children)
        }));

    setState(prev => {
      const cards = removeDeleted(prev.cards);
      return {
        ...prev,
        cards,
      };
    });
  }, []);

  const restoreCard = useCallback((id: string, targetParentId: string | null) => {
    setState(prev => {
      let detachedCard: Card | null = null;
      let originalParentId: string | null = null;
      const now = Date.now();

      const rebuildRestoredSubtree = (card: Card, parentId: string | null): Card => {
        const rebuilt: Card = {
          ...card,
          parentId,
          isDeleted: false,
          updatedAt: now,
          children: []
        };
        rebuilt.children = card.children.map(child => rebuildRestoredSubtree(child, card.id));
        return rebuilt;
      };

      const findNearestActiveParentId = (cards: Card[], parentId: string | null): string | null => {
        let currentParentId = parentId;
        while (currentParentId !== null) {
          const parent = findCardById(cards, currentParentId);
          if (!parent) return null;
          if (!parent.isDeleted) return parent.id;
          currentParentId = parent.parentId;
        }
        return null;
      };

      const detachCard = (cards: Card[]): Card[] => {
        const next: Card[] = [];
        for (const card of cards) {
          if (card.id === id) {
            detachedCard = card;
            originalParentId = card.parentId;
            continue;
          }
          next.push({ ...card, children: detachCard(card.children) });
        }
        return next;
      };

      const withoutCard = detachCard(prev.cards);
      if (!detachedCard) return prev;

      const resolvedTargetParentId =
        findNearestActiveParentId(withoutCard, targetParentId) ??
        findNearestActiveParentId(withoutCard, originalParentId) ??
        null;

      const restoredCard = rebuildRestoredSubtree(detachedCard, resolvedTargetParentId);
      const withCardAdded = addCardToParent(withoutCard, resolvedTargetParentId, restoredCard);
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
          const matchesBlocks = card.blocks.some((block) => blockMatchesSearch(block, lowerQuery));

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
        }
        // Always traverse children so deleted descendants are included
        // even when their parent is also deleted.
        traverse(c.children);
      }
    };
    traverse(state.cards);
    return deleted;
  }, [state.cards]);

  const exportData = useCallback(async () => {
    const resolvedVersion = (await ensureAppVersionLoaded()) || RUNTIME_VERSION_DISPLAY || "unknown";
    const now = new Date();
    const data = buildExportBackup(state.cards, resolvedVersion, now);
    const jsonString = stringifyExportBackup(data);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = createExportFilename(now);
    
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
    const importedCards = getImportCards(data);

    if (mode === 'override') {
      setState({
        cards: importedCards,
      });
    } else {
      setState(prev => {
        const cards = [...prev.cards, ...importedCards];
        return {
          cards,
        };
      });
    }
  }, []);

  const updateTodoListTitle = useCallback((listId: string, title: string) => {
    setState(prev => ({
      ...prev,
      cards: updateCardInTree(prev.cards, listId, { title })
    }));
  }, []);

  const updateTodoListColor = useCallback((listId: string, color: string) => {
    setState(prev => ({
      ...prev,
      cards: updateCardInTree(prev.cards, listId, { todoListColor: color })
    }));
  }, []);

  const deleteTodoList = useCallback((listId: string) => {
    setState(prev => ({
      ...prev,
      cards: updateCardInTree(prev.cards, listId, { cardType: 'folder' })
    }));
  }, []);

  const reorderTodoLists = useCallback((ids: string[]) => {
    setState(prev => {
      const now = Date.now();
      const len = ids.length;
      let cards = prev.cards;
      ids.forEach((id, index) => {
        cards = updateCardInTree(cards, id, { todoListOrder: now + (len - index) });
      });
      return { ...prev, cards };
    });
  }, []);

  const moveTodoItem = useCallback((activeItemId: string, targetListId: string, overItemId: string | null, position: 'before' | 'after') => {
    setState(prev => {
      const todoLists = getTodoListsFromCards(prev.cards);
      const sourceList = todoLists.find((list) => list.items.some((item) => item.id === activeItemId));
      if (!sourceList || sourceList.id !== targetListId) return prev;
      const targetCardId = overItemId ?? sourceList.items[sourceList.items.length - 1]?.cardId;
      if (!targetCardId || targetCardId === activeItemId) return prev;
      return { ...prev, cards: moveCardRelativeInTree(prev.cards, activeItemId, targetCardId, position) };
    });
  }, []);

  const moveTodoCardToPosition = useCallback((listId: string, cardId: string, position: number, excludedCardIds: Set<string> = new Set()) => {
    setState(prev => {
      const targetList = getTodoListsFromCards(prev.cards).find((list) => list.id === listId);
      if (!targetList || !targetList.items.some((item) => item.cardId === cardId)) return prev;
      const eligibleItems = targetList.items.filter((item) => !excludedCardIds.has(item.cardId));
      const withoutActive = eligibleItems.filter((item) => item.cardId !== cardId);
      if (withoutActive.length === 0) return prev;
      const safePosition = Math.min(Math.max(Math.floor(position), 1), withoutActive.length + 1);
      const targetIndex = safePosition > withoutActive.length ? withoutActive.length - 1 : safePosition - 1;
      const targetCardId = withoutActive[targetIndex]?.cardId;
      if (!targetCardId) return prev;
      return {
        ...prev,
        cards: moveCardRelativeInTree(prev.cards, cardId, targetCardId, safePosition > withoutActive.length ? 'after' : 'before')
      };
    });
  }, []);

  return {
    cards: state.cards,
    todoLists: getTodoListsFromCards(state.cards),
    isLoaded,
    addCard,
    updateCard,
    updateCardBlocks,
    moveCard,
    reorderCardRelative,
    reorderChildren,
    moveCardStep,
    deleteCard,
    permanentlyDeleteCard,
    emptyRecycleBin,
    restoreCard,
    getCard,
    searchCards,
    getDeletedCards,
    exportData,
    importData,
    moveTodoItem,
    moveTodoCardToPosition,
    updateTodoListTitle,
    updateTodoListColor,
    deleteTodoList,
    reorderTodoLists
  };
}
