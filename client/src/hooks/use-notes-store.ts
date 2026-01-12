import { useState, useEffect, useCallback } from 'react';
import type { Category, Card, AppState } from '@/lib/types';
import { 
  generateId, 
  removeCategoryById, 
  addCategoryToParent, 
  updateCategoryInTree,
  getAllCategoryIds,
  canMoveCategory,
  moveCategoryToParent
} from '@/lib/types';

const STORAGE_KEY = 'notecards_data';

const defaultState: AppState = {
  categories: [],
  cards: []
};

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
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

  const addCategory = useCallback((name: string, parentId: string | null) => {
    const newCategory: Category = {
      id: generateId(),
      name,
      parentId,
      children: []
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

  const addCard = useCallback((categoryId: string) => {
    const newCard: Card = {
      id: generateId(),
      title: '',
      content: '',
      bullets: [],
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
    return state.cards.filter(card => {
      if (!includeDeleted && card.isDeleted) return false;
      return card.categoryId === categoryId;
    });
  }, [state.cards]);

  const getDeletedCards = useCallback(() => {
    return state.cards.filter(card => card.isDeleted);
  }, [state.cards]);

  const searchCards = useCallback((query: string, categoryId: string) => {
    const lowerQuery = query.toLowerCase();
    return state.cards.filter(card => {
      if (card.isDeleted) return false;
      if (card.categoryId !== categoryId) return false;
      
      const matchesTitle = card.title.toLowerCase().includes(lowerQuery);
      const matchesContent = card.content.toLowerCase().includes(lowerQuery);
      const matchesBullets = card.bullets.some(b => 
        b.content.toLowerCase().includes(lowerQuery)
      );
      
      return matchesTitle || matchesContent || matchesBullets;
    });
  }, [state.cards]);

  const canMoveCategoryTo = useCallback((categoryId: string, targetParentId: string | null) => {
    return canMoveCategory(state.categories, categoryId, targetParentId);
  }, [state.categories]);

  return {
    categories: state.categories,
    cards: state.cards,
    addCategory,
    renameCategory,
    moveCategory,
    deleteCategory,
    addCard,
    updateCard,
    moveCard,
    deleteCard,
    restoreCard,
    permanentlyDeleteCard,
    getCardsForCategory,
    getDeletedCards,
    searchCards,
    canMoveCategoryTo
  };
}