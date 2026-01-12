import { useState, useEffect, useCallback } from 'react';
import type { Category, Card, AppState, ContentBlock } from '@/lib/types';
import { 
  generateId, 
  removeCategoryById, 
  addCategoryToParent, 
  updateCategoryInTree,
  getAllCategoryIds,
  canMoveCategory,
  moveCategoryToParent,
  migrateCard
} from '@/lib/types';

const STORAGE_KEY = 'notecards_data';

const defaultState: AppState = {
  categories: [],
  cards: []
};

function migrateCategories(categories: Category[]): Category[] {
  return categories.map((cat, index) => ({
    ...cat,
    sortOrder: cat.sortOrder ?? (Date.now() - (categories.length - index) * 1000),
    children: migrateCategories(cat.children)
  }));
}

function sortCategoriesBySortOrder(categories: Category[]): Category[] {
  return [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(cat => ({
      ...cat,
      children: sortCategoriesBySortOrder(cat.children)
    }));
}

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old cards to new block-based format and categories to have sortOrder
      return {
        categories: sortCategoriesBySortOrder(migrateCategories(parsed.categories || [])),
        cards: (parsed.cards || []).map(migrateCard)
      };
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

  const addCategory = useCallback((name: string, parentId: string | null): string => {
    const newCategory: Category = {
      id: generateId(),
      name,
      parentId,
      children: [],
      sortOrder: Date.now()
    };
    setState(prev => ({
      ...prev,
      categories: addCategoryToParent(prev.categories, parentId, newCategory)
    }));
    return newCategory.id;
  }, []);

  const renameCategory = useCallback((id: string, name: string) => {
    setState(prev => ({
      ...prev,
      categories: updateCategoryInTree(prev.categories, id, { name })
    }));
  }, []);

  const moveCategory = useCallback((categoryId: string, newParentId: string | null) => {
    setState(prev => {
      if (!canMoveCategory(prev.categories, categoryId, newParentId)) {
        return prev;
      }
      return {
        ...prev,
        categories: moveCategoryToParent(prev.categories, categoryId, newParentId)
      };
    });
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setState(prev => {
      const categoryIds = [id, ...getAllCategoryIds(
        prev.categories.filter(c => c.id === id).flatMap(c => c.children)
      )];
      
      const updatedCards = prev.cards.map(card => {
        if (categoryIds.includes(card.categoryId)) {
          return { ...card, isDeleted: true };
        }
        return card;
      });

      return {
        categories: removeCategoryById(prev.categories, id),
        cards: updatedCards
      };
    });
  }, []);

  const reorderSubcategories = useCallback((parentId: string | null, orderedIds: string[]) => {
    setState(prev => {
      const updateSortOrders = (categories: Category[]): Category[] => {
        return categories.map(cat => {
          // Check if this category is in the ordered list
          const orderIndex = orderedIds.indexOf(cat.id);
          const newSortOrder = orderIndex >= 0 ? orderIndex : cat.sortOrder;
          
          return {
            ...cat,
            sortOrder: newSortOrder,
            children: updateSortOrders(cat.children)
          };
        }).sort((a, b) => a.sortOrder - b.sortOrder);
      };
      
      return {
        ...prev,
        categories: updateSortOrders(prev.categories)
      };
    });
  }, []);

  const addCard = useCallback((categoryId: string): string => {
    const newCard: Card = {
      id: generateId(),
      title: '',
      blocks: [],
      categoryId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false
    };
    setState(prev => ({
      ...prev,
      cards: [newCard, ...prev.cards]
    }));
    return newCard.id;
  }, []);

  const updateCard = useCallback((id: string, updates: Partial<Omit<Card, 'id' | 'createdAt'>>) => {
    setState(prev => ({
      ...prev,
      cards: prev.cards.map(card => 
        card.id === id 
          ? { ...card, ...updates, updatedAt: Date.now() }
          : card
      )
    }));
  }, []);

  const updateCardBlocks = useCallback((id: string, blocks: ContentBlock[]) => {
    setState(prev => ({
      ...prev,
      cards: prev.cards.map(card => 
        card.id === id 
          ? { ...card, blocks, updatedAt: Date.now() }
          : card
      )
    }));
  }, []);

  const moveCard = useCallback((cardId: string, categoryId: string) => {
    setState(prev => ({
      ...prev,
      cards: prev.cards.map(card => 
        card.id === cardId 
          ? { ...card, categoryId, isDeleted: false, updatedAt: Date.now() }
          : card
      )
    }));
  }, []);

  const deleteCard = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      cards: prev.cards.map(card => 
        card.id === id 
          ? { ...card, isDeleted: true, updatedAt: Date.now() }
          : card
      )
    }));
  }, []);

  const restoreCard = useCallback((id: string, categoryId: string) => {
    setState(prev => ({
      ...prev,
      cards: prev.cards.map(card => 
        card.id === id 
          ? { ...card, isDeleted: false, categoryId, updatedAt: Date.now() }
          : card
      )
    }));
  }, []);

  const permanentlyDeleteCard = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      cards: prev.cards.filter(card => card.id !== id)
    }));
  }, []);

  const getCardsForCategory = useCallback((categoryId: string, includeDeleted = false) => {
    return state.cards
      .filter(card => {
        if (!includeDeleted && card.isDeleted) return false;
        return card.categoryId === categoryId;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [state.cards]);

  const getDeletedCards = useCallback(() => {
    return state.cards
      .filter(card => card.isDeleted)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [state.cards]);

  const searchCards = useCallback((query: string, categoryId: string) => {
    const lowerQuery = query.toLowerCase();
    
    // Get all category IDs to search (current + all descendants)
    const categoryIdsToSearch = new Set<string>([categoryId]);
    const addDescendants = (cats: Category[]) => {
      for (const cat of cats) {
        if (categoryIdsToSearch.has(cat.parentId || '')) {
          categoryIdsToSearch.add(cat.id);
        }
        addDescendants(cat.children);
      }
    };
    // Find category and add all its descendants
    const findAndAddDescendants = (cats: Category[]) => {
      for (const cat of cats) {
        if (cat.id === categoryId) {
          const addAllChildren = (c: Category) => {
            categoryIdsToSearch.add(c.id);
            c.children.forEach(addAllChildren);
          };
          cat.children.forEach(addAllChildren);
        } else {
          findAndAddDescendants(cat.children);
        }
      }
    };
    findAndAddDescendants(state.categories);
    
    // Find categories whose names match the query
    const matchingCategoryIds = new Set<string>();
    const findMatchingCategories = (cats: Category[]) => {
      for (const cat of cats) {
        if (categoryIdsToSearch.has(cat.id) && cat.name.toLowerCase().includes(lowerQuery)) {
          matchingCategoryIds.add(cat.id);
        }
        findMatchingCategories(cat.children);
      }
    };
    findMatchingCategories(state.categories);
    
    return state.cards.filter(card => {
      if (card.isDeleted) return false;
      if (!categoryIdsToSearch.has(card.categoryId)) return false;
      
      // Include all cards from categories whose names match
      if (matchingCategoryIds.has(card.categoryId)) return true;
      
      const matchesTitle = card.title.toLowerCase().includes(lowerQuery);
      const matchesBlocks = card.blocks.some(block => {
        if (block.type === 'text') {
          return block.content.toLowerCase().includes(lowerQuery);
        } else if (block.type === 'bullets') {
          return block.items.some(item => item.content.toLowerCase().includes(lowerQuery));
        }
        return false;
      });
      
      return matchesTitle || matchesBlocks;
    });
  }, [state.cards, state.categories]);

  const canMoveCategoryTo = useCallback((categoryId: string, targetParentId: string | null) => {
    return canMoveCategory(state.categories, categoryId, targetParentId);
  }, [state.categories]);

  const reorderCard = useCallback((cardId: string, direction: 'up' | 'down') => {
    setState(prev => {
      const card = prev.cards.find(c => c.id === cardId);
      if (!card) return prev;
      
      // Get cards in same category, sorted by updatedAt descending (newest first)
      const categoryCards = prev.cards
        .filter(c => c.categoryId === card.categoryId && !c.isDeleted)
        .sort((a, b) => b.updatedAt - a.updatedAt);
      
      const currentIndex = categoryCards.findIndex(c => c.id === cardId);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (targetIndex < 0 || targetIndex >= categoryCards.length) return prev;
      
      const targetCard = categoryCards[targetIndex];
      
      // Swap the updatedAt values to swap positions
      return {
        ...prev,
        cards: prev.cards.map(c => {
          if (c.id === cardId) return { ...c, updatedAt: targetCard.updatedAt };
          if (c.id === targetCard.id) return { ...c, updatedAt: card.updatedAt };
          return c;
        })
      };
    });
  }, []);

  const reorderCardsByIndex = useCallback((cardIds: string[]) => {
    setState(prev => {
      // Assign new timestamps based on the order (newest first)
      const baseTime = Date.now();
      const updatedCards = prev.cards.map(card => {
        const newIndex = cardIds.indexOf(card.id);
        if (newIndex !== -1) {
          return { ...card, updatedAt: baseTime - newIndex };
        }
        return card;
      });
      return { ...prev, cards: updatedCards };
    });
  }, []);

  return {
    categories: state.categories,
    cards: state.cards,
    addCategory,
    renameCategory,
    moveCategory,
    deleteCategory,
    reorderSubcategories,
    addCard,
    updateCard,
    updateCardBlocks,
    moveCard,
    deleteCard,
    restoreCard,
    permanentlyDeleteCard,
    getCardsForCategory,
    getDeletedCards,
    searchCards,
    canMoveCategoryTo,
    reorderCard,
    reorderCardsByIndex
  };
}