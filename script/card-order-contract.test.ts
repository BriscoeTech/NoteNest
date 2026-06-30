import assert from 'node:assert/strict';
import {
  ensureSiblingSortOrderMatchesArray,
  reorderVisibleSiblingCards,
  sortCardsByVisualOrder,
} from '../src/src/lib/card-order';
import type { Card } from '../src/src/lib/types';

function makeCard(id: string, sortOrder: number, isDeleted = false): Card {
  return {
    id,
    title: id,
    cardType: 'note',
    isTodoList: false,
    todoListColor: null,
    todoListOrder: null,
    blocks: [],
    parentId: null,
    children: [],
    sortOrder,
    createdAt: 1,
    updatedAt: 1,
    isDeleted,
  };
}

const cards = [
  makeCard('a', 30),
  makeCard('b', 20),
  makeCard('c', 10),
];

const reordered = reorderVisibleSiblingCards(cards, ['c', 'a', 'b'], 1000);
assert.deepEqual(reordered.map((card) => card.id), ['c', 'a', 'b']);
assert.deepEqual(sortCardsByVisualOrder(reordered).map((card) => card.id), ['c', 'a', 'b']);
assert.deepEqual(reordered.map((card) => card.sortOrder), [1003, 1002, 1001]);

const withDeleted = [
  makeCard('a', 30),
  makeCard('deleted', 25, true),
  makeCard('b', 20),
  makeCard('c', 10),
];
const reorderedWithDeleted = reorderVisibleSiblingCards(withDeleted, ['b', 'c', 'a'], 2000);
assert.deepEqual(reorderedWithDeleted.map((card) => card.id), ['b', 'c', 'a', 'deleted']);
assert.deepEqual(sortCardsByVisualOrder(reorderedWithDeleted).map((card) => card.id), ['b', 'c', 'a', 'deleted']);

const partialSearchLikeIds = reorderVisibleSiblingCards(cards, ['c', 'a'], 3000);
assert.equal(partialSearchLikeIds, cards);

const duplicateSortOrders = [
  makeCard('first', 50),
  makeCard('second', 50),
  makeCard('third', 60),
];
const repaired = ensureSiblingSortOrderMatchesArray(duplicateSortOrders, 4000);
assert.deepEqual(repaired.map((card) => card.id), ['first', 'second', 'third']);
assert.deepEqual(sortCardsByVisualOrder(repaired).map((card) => card.id), ['first', 'second', 'third']);
assert.equal(repaired[0].sortOrder > repaired[1].sortOrder, true);
assert.equal(repaired[1].sortOrder > repaired[2].sortOrder, true);

const repairedSingle = ensureSiblingSortOrderMatchesArray([makeCard('single', Number.NaN)], 5000);
assert.equal(repairedSingle[0].sortOrder, 5000);
