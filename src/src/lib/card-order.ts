import type { Card } from './types';

type SortableCard = Pick<Card, 'sortOrder'>;

function getSortOrder(card: SortableCard): number {
  return Number.isFinite(card.sortOrder) ? card.sortOrder : 0;
}

export function sortCardsByVisualOrder<T extends SortableCard>(cards: T[]): T[] {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => {
      const sortDifference = getSortOrder(b.card) - getSortOrder(a.card);
      return sortDifference === 0 ? a.index - b.index : sortDifference;
    })
    .map(({ card }) => card);
}

export function getNextSiblingSortOrder(cards: SortableCard[], now = Date.now()): number {
  return Math.max(now, ...cards.map(getSortOrder)) + 1;
}

export function assignSortOrdersByVisualOrder(cards: Card[], now = Date.now()): Card[] {
  const topSortOrder = getNextSiblingSortOrder(cards, now) + cards.length - 1;
  return cards.map((card, index) => ({
    ...card,
    sortOrder: topSortOrder - index,
  }));
}

export function ensureSiblingSortOrderMatchesArray(cards: Card[], now = Date.now()): Card[] {
  if (cards.length === 0) return cards;

  let previousSortOrder = Infinity;
  const seenSortOrders = new Set<number>();
  const shouldRewrite = cards.some((card) => {
    const sortOrder = card.sortOrder;
    const invalid = !Number.isFinite(sortOrder);
    const duplicate = seenSortOrders.has(sortOrder);
    const notDescending = sortOrder >= previousSortOrder;
    previousSortOrder = sortOrder;
    seenSortOrders.add(sortOrder);
    return invalid || duplicate || notDescending;
  });

  if (!shouldRewrite) return cards;

  const topSortOrder = Math.max(now, cards.length, ...cards.map(getSortOrder));
  return cards.map((card, index) => ({
    ...card,
    sortOrder: topSortOrder - index,
  }));
}

export function reorderVisibleSiblingCards(cards: Card[], orderedVisibleIds: string[], now = Date.now()): Card[] {
  const uniqueOrderedIds = new Set(orderedVisibleIds);
  if (uniqueOrderedIds.size !== orderedVisibleIds.length) return cards;

  const visibleCards = cards.filter((card) => !card.isDeleted);
  if (
    visibleCards.length !== orderedVisibleIds.length ||
    visibleCards.some((card) => !uniqueOrderedIds.has(card.id))
  ) {
    return cards;
  }

  const cardById = new Map(cards.map((card) => [card.id, card]));
  const orderedVisibleCards: Card[] = [];
  for (const id of orderedVisibleIds) {
    const card = cardById.get(id);
    if (!card) return cards;
    orderedVisibleCards.push(card);
  }

  const hiddenCards = cards.filter((card) => !uniqueOrderedIds.has(card.id));
  return assignSortOrdersByVisualOrder([...orderedVisibleCards, ...hiddenCards], now);
}
