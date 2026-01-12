export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children: Category[];
}

export interface BulletItem {
  id: string;
  content: string;
  indent: number;
}

export interface TextBlock {
  id: string;
  type: 'text';
  content: string;
}

export interface BulletBlock {
  id: string;
  type: 'bullets';
  items: BulletItem[];
}

export interface ImageBlock {
  id: string;
  type: 'image';
  dataUrl: string;
  width: number; // percentage 10-100
}

export type ContentBlock = TextBlock | BulletBlock | ImageBlock;

export interface Card {
  id: string;
  title: string;
  blocks: ContentBlock[];
  categoryId: string;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
}

export interface AppState {
  categories: Category[];
  cards: Card[];
}

export const RECYCLE_BIN_ID = '__recycle_bin__';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];
  function traverse(cats: Category[]) {
    for (const cat of cats) {
      result.push(cat);
      traverse(cat.children);
    }
  }
  traverse(categories);
  return result;
}

export function findCategoryById(categories: Category[], id: string): Category | null {
  for (const cat of categories) {
    if (cat.id === id) return cat;
    const found = findCategoryById(cat.children, id);
    if (found) return found;
  }
  return null;
}

export function removeCategoryById(categories: Category[], id: string): Category[] {
  return categories
    .filter(cat => cat.id !== id)
    .map(cat => ({
      ...cat,
      children: removeCategoryById(cat.children, id)
    }));
}

export function addCategoryToParent(categories: Category[], parentId: string | null, newCategory: Category): Category[] {
  if (parentId === null) {
    return [...categories, newCategory];
  }
  return categories.map(cat => {
    if (cat.id === parentId) {
      return { ...cat, children: [...cat.children, newCategory] };
    }
    return { ...cat, children: addCategoryToParent(cat.children, parentId, newCategory) };
  });
}

export function updateCategoryInTree(categories: Category[], id: string, updates: Partial<Category>): Category[] {
  return categories.map(cat => {
    if (cat.id === id) {
      return { ...cat, ...updates };
    }
    return { ...cat, children: updateCategoryInTree(cat.children, id, updates) };
  });
}

export function getAllCategoryIds(categories: Category[]): string[] {
  const ids: string[] = [];
  function traverse(cats: Category[]) {
    for (const cat of cats) {
      ids.push(cat.id);
      traverse(cat.children);
    }
  }
  traverse(categories);
  return ids;
}

export function getDescendantIds(categories: Category[], id: string): string[] {
  const category = findCategoryById(categories, id);
  if (!category) return [];
  return getAllCategoryIds(category.children);
}

export function canMoveCategory(categories: Category[], categoryId: string, targetParentId: string | null): boolean {
  if (categoryId === targetParentId) return false;
  if (targetParentId === null) return true;
  const descendantIds = getDescendantIds(categories, categoryId);
  return !descendantIds.includes(targetParentId);
}

export function moveCategoryToParent(categories: Category[], categoryId: string, newParentId: string | null): Category[] {
  const category = findCategoryById(categories, categoryId);
  if (!category) return categories;
  
  const withoutCategory = removeCategoryById(categories, categoryId);
  const movedCategory: Category = { ...category, parentId: newParentId };
  
  return addCategoryToParent(withoutCategory, newParentId, movedCategory);
}

// Migration helper for old card format
export function migrateCard(card: any): Card {
  if (card.blocks) return card as Card;
  
  const blocks: ContentBlock[] = [];
  
  if (card.content && card.content.trim()) {
    blocks.push({ id: generateId(), type: 'text', content: card.content });
  }
  
  if (card.bullets && card.bullets.length > 0) {
    blocks.push({ id: generateId(), type: 'bullets', items: card.bullets });
  }
  
  return {
    id: card.id,
    title: card.title || '',
    blocks,
    categoryId: card.categoryId,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    isDeleted: card.isDeleted || false
  };
}