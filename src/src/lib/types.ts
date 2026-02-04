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

export interface CheckboxBlock {
  id: string;
  type: 'checkbox';
  checked: boolean;
}

export interface LinkBlock {
  id: string;
  type: 'link';
  url: string;
}

export type ContentBlock = TextBlock | BulletBlock | ImageBlock | CheckboxBlock | LinkBlock;

export interface Card {
  id: string;
  title: string;
  blocks: ContentBlock[];
  parentId: string | null;
  children: Card[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
  // Legacy fields for migration
  categoryId?: string;
  content?: string;
  bullets?: BulletItem[];
}

export interface AppState {
  cards: Card[]; // Root level cards
}

export const RECYCLE_BIN_ID = '__recycle_bin__';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function findCardById(cards: Card[], id: string): Card | null {
  for (const card of cards) {
    if (card.id === id) return card;
    const found = findCardById(card.children, id);
    if (found) return found;
  }
  return null;
}

export function removeCardFromTree(cards: Card[], id: string): Card[] {
  return cards
    .filter(c => c.id !== id)
    .map(c => ({
      ...c,
      children: removeCardFromTree(c.children, id)
    }));
}

export function addCardToParent(cards: Card[], parentId: string | null, newCard: Card): Card[] {
  if (parentId === null) {
    return [newCard, ...cards];
  }
  return cards.map(c => {
    if (c.id === parentId) {
      return { ...c, children: [newCard, ...c.children] };
    }
    return { ...c, children: addCardToParent(c.children, parentId, newCard) };
  });
}

export function updateCardInTree(cards: Card[], id: string, updates: Partial<Card>): Card[] {
  return cards.map(c => {
    if (c.id === id) {
      return { ...c, ...updates, updatedAt: Date.now() };
    }
    return { ...c, children: updateCardInTree(c.children, id, updates) };
  });
}

export function getAllCardIds(cards: Card[]): string[] {
  const ids: string[] = [];
  function traverse(list: Card[]) {
    for (const c of list) {
      ids.push(c.id);
      traverse(c.children);
    }
  }
  traverse(cards);
  return ids;
}

export function getDescendantIds(cards: Card[], id: string): string[] {
  const card = findCardById(cards, id);
  if (!card) return [];
  return getAllCardIds(card.children);
}

export function canMoveCard(cards: Card[], cardId: string, targetParentId: string | null): boolean {
  if (cardId === targetParentId) return false;
  if (targetParentId === null) return true;
  const descendantIds = getDescendantIds(cards, cardId);
  return !descendantIds.includes(targetParentId);
}

export function moveCardToParent(cards: Card[], cardId: string, newParentId: string | null): Card[] {
  const card = findCardById(cards, cardId);
  if (!card) return cards;
  
  const withoutCard = removeCardFromTree(cards, cardId);
  const movedCard: Card = { ...card, parentId: newParentId, updatedAt: Date.now() };
  
  return addCardToParent(withoutCard, newParentId, movedCard);
}
