import type { Card, ContentBlock, TodoItem, TodoList } from '@/lib/types';
import { generateId } from '@/lib/types';
import { inferCardTypeFromCardData } from '@/lib/card-types';
import { normalizeContentBlock } from '@/lib/block-types';

export interface ExportBackup {
  version: string;
  exportedAt: string;
  cards: Card[];
  todoCardIds?: string[];
  todoItems?: TodoItem[];
  todoLists?: TodoList[];
}

export function normalizeBlocks(blocks: ContentBlock[] = []): ContentBlock[] {
  return blocks.map(normalizeContentBlock);
}

export function normalizeCardTree(cards: Card[] = []): Card[] {
  return cards.map((card) => ({
    ...card,
    cardType: inferCardTypeFromCardData(card),
    blocks: normalizeBlocks(card.blocks || []),
    children: normalizeCardTree(card.children || []),
  }));
}

export function migrateLegacyData(categories: any[] = [], legacyCards: any[] = []): Card[] {
  const categoryMap = new Map<string, Card>();

  const convertCategory = (cat: any): Card => ({
    id: cat.id,
    title: cat.name,
    cardType: 'folder',
    blocks: [],
    parentId: cat.parentId,
    children: [],
    sortOrder: cat.sortOrder || Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDeleted: false,
  });

  const convertCard = (card: any): Card => {
    const blocks = [...(card.blocks || [])];
    if (!blocks.length && card.content) {
      blocks.push({ id: generateId(), type: 'text', content: card.content });
    }
    if (card.bullets && card.bullets.length) {
      blocks.push({ id: generateId(), type: 'bullets', items: card.bullets });
    }

    return {
      id: card.id,
      title: card.title || 'Untitled',
      cardType: inferCardTypeFromCardData({ blocks, children: [] }),
      blocks: normalizeBlocks(blocks),
      parentId: card.categoryId || null,
      children: [],
      sortOrder: Date.now(),
      createdAt: card.createdAt || Date.now(),
      updatedAt: card.updatedAt || Date.now(),
      isDeleted: card.isDeleted || false,
    };
  };

  const flatCategories: any[] = [];
  const traverse = (cats: any[]) => {
    for (const cat of cats) {
      flatCategories.push(cat);
      traverse(cat.children || []);
    }
  };
  traverse(categories);

  flatCategories.forEach((cat) => {
    categoryMap.set(cat.id, convertCategory(cat));
  });

  const convertedCards = legacyCards.map(convertCard);
  const rootCards: Card[] = [];

  flatCategories.forEach((cat) => {
    const card = categoryMap.get(cat.id)!;
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      const parent = categoryMap.get(cat.parentId)!;
      parent.children.push(card);
    } else {
      rootCards.push(card);
    }
  });

  convertedCards.forEach((card) => {
    if (card.parentId && categoryMap.has(card.parentId)) {
      const parent = categoryMap.get(card.parentId)!;
      parent.children.push(card);
    } else {
      rootCards.push(card);
    }
  });

  const sortCards = (list: Card[]) => {
    list.sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));
    list.forEach((card) => sortCards(card.children));
  };
  sortCards(rootCards);

  return rootCards;
}

export function getImportCards(data: any): Card[] {
  const importedCards = data?.categories
    ? migrateLegacyData(data.categories, data.cards || [])
    : data?.cards || [];
  return normalizeCardTree(importedCards);
}

export function getImportTodoCardIds(data: any): string[] {
  if (!Array.isArray(data?.todoCardIds)) return [];
  return data.todoCardIds.filter((id: unknown): id is string => typeof id === 'string');
}

export function getImportTodoItems(data: any): TodoItem[] {
  if (!Array.isArray(data?.todoItems)) return [];
  return data.todoItems
    .map((item: any): TodoItem | null => {
      if (!item || typeof item.id !== 'string') return null;
      if (item.type === 'card' && typeof item.cardId === 'string') {
        return { id: item.id, type: 'card', cardId: item.cardId };
      }
      if (item.type === 'divider') {
        return { id: item.id, type: 'divider', title: typeof item.title === 'string' ? item.title : '' };
      }
      return null;
    })
    .filter((item: TodoItem | null): item is TodoItem => Boolean(item));
}

export function getImportTodoLists(data: any): TodoList[] {
  if (!Array.isArray(data?.todoLists)) return [];
  return data.todoLists
    .map((list: any): TodoList | null => {
      if (!list || typeof list.id !== 'string') return null;
      return {
        id: list.id,
        title: typeof list.title === 'string' ? list.title : 'New List',
        color: typeof list.color === 'string' ? list.color : '#2563eb',
        items: getImportTodoItems({ todoItems: list.items }),
      };
    })
    .filter((list: TodoList | null): list is TodoList => Boolean(list));
}

export function buildExportBackup(cards: Card[], version: string, exportedAt: Date = new Date(), todoLists: TodoList[] = []): ExportBackup {
  const todoItems = todoLists[0]?.items ?? [];
  const todoCardIds = todoLists
    .flatMap((list) => list.items)
    .filter((item): item is Extract<TodoItem, { type: 'card' }> => item.type === 'card')
    .map((item) => item.cardId);

  return {
    version,
    exportedAt: exportedAt.toISOString(),
    cards,
    todoCardIds,
    todoItems,
    todoLists,
  };
}

export function stringifyExportBackup(data: ExportBackup): string {
  return JSON.stringify(data, null, 2);
}

export function createExportFilename(exportedAt: Date = new Date()): string {
  const timestamp = [
    exportedAt.getFullYear(),
    String(exportedAt.getMonth() + 1).padStart(2, '0'),
    String(exportedAt.getDate()).padStart(2, '0'),
  ].join('-') + '_' + [
    String(exportedAt.getHours()).padStart(2, '0'),
    String(exportedAt.getMinutes()).padStart(2, '0'),
  ].join('-');
  return `notes-backup-${timestamp}.json`;
}
