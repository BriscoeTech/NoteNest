import type { TodoCardItem } from './types';

export function applyTodoCardOrder(items: TodoCardItem[], todoCardOrder?: string[] | null): TodoCardItem[] {
  if (!todoCardOrder?.length) return items;

  const itemByCardId = new Map(items.map((item) => [item.cardId, item]));
  const seen = new Set<string>();
  const orderedItems: TodoCardItem[] = [];

  for (const cardId of todoCardOrder) {
    const item = itemByCardId.get(cardId);
    if (!item || seen.has(cardId)) continue;
    orderedItems.push(item);
    seen.add(cardId);
  }

  for (const item of items) {
    if (seen.has(item.cardId)) continue;
    orderedItems.push(item);
  }

  return orderedItems;
}

export function moveTodoCardInOrder(
  items: TodoCardItem[],
  activeCardId: string,
  overCardId: string | null,
  position: 'before' | 'after'
): string[] {
  const ids = items.map((item) => item.cardId);
  if (!ids.includes(activeCardId)) return ids;
  if (overCardId === activeCardId) return ids;

  const withoutActive = ids.filter((id) => id !== activeCardId);
  if (!overCardId) return [...withoutActive, activeCardId];

  const targetIndex = withoutActive.indexOf(overCardId);
  if (targetIndex === -1) return ids;

  const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
  const next = [...withoutActive];
  next.splice(insertIndex, 0, activeCardId);
  return next;
}

export function moveTodoCardToPriority(
  items: TodoCardItem[],
  cardId: string,
  position: number,
  excludedCardIds: Set<string> = new Set()
): string[] {
  const ids = items.map((item) => item.cardId);
  if (!ids.includes(cardId) || excludedCardIds.has(cardId)) return ids;

  const eligibleIds = ids.filter((id) => !excludedCardIds.has(id));
  const withoutActive = eligibleIds.filter((id) => id !== cardId);
  if (withoutActive.length === 0) return ids;

  const safePosition = Math.min(Math.max(Math.floor(position), 1), withoutActive.length + 1);
  const insertIndex = safePosition > withoutActive.length ? withoutActive.length : safePosition - 1;
  const nextEligibleIds = [...withoutActive];
  nextEligibleIds.splice(insertIndex, 0, cardId);

  let eligibleIndex = 0;
  return ids.map((id) => {
    if (excludedCardIds.has(id)) return id;
    return nextEligibleIds[eligibleIndex++];
  });
}
