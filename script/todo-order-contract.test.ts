import assert from 'node:assert/strict';
import {
  applyTodoCardOrder,
  moveTodoCardInOrder,
  moveTodoCardToPriority,
} from '../src/src/lib/todo-order';
import type { TodoCardItem } from '../src/src/lib/types';

function item(cardId: string): TodoCardItem {
  return { id: cardId, type: 'card', cardId };
}

const naturalItems = [item('a'), item('b'), item('c'), item('d')];

assert.deepEqual(
  applyTodoCardOrder(naturalItems, ['c', 'a']).map((todoItem) => todoItem.cardId),
  ['c', 'a', 'b', 'd']
);

assert.deepEqual(
  applyTodoCardOrder(naturalItems, ['missing', 'c', 'c', 'a']).map((todoItem) => todoItem.cardId),
  ['c', 'a', 'b', 'd']
);

assert.deepEqual(
  moveTodoCardInOrder(naturalItems, 'a', 'c', 'after'),
  ['b', 'c', 'a', 'd']
);

assert.deepEqual(
  moveTodoCardInOrder(naturalItems, 'c', 'a', 'before'),
  ['c', 'a', 'b', 'd']
);

assert.deepEqual(
  moveTodoCardInOrder(naturalItems, 'b', null, 'after'),
  ['a', 'c', 'd', 'b']
);

assert.deepEqual(
  moveTodoCardToPriority(naturalItems, 'd', 1, new Set(['b'])),
  ['d', 'b', 'a', 'c']
);

assert.deepEqual(
  moveTodoCardToPriority(naturalItems, 'a', 99, new Set(['b'])),
  ['c', 'b', 'd', 'a']
);

assert.deepEqual(
  moveTodoCardToPriority(naturalItems, 'b', 1, new Set(['b'])),
  ['a', 'b', 'c', 'd']
);
