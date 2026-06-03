import assert from 'node:assert/strict';
import {
  buildExportBackup,
  createExportFilename,
  getImportCards,
  getImportTodoCardIds,
  getImportTodoItems,
  stringifyExportBackup,
} from '../src/src/lib/import-export';
import type { Card, TodoItem } from '../src/src/lib/types';

const exportedAt = new Date(2026, 3, 26, 9, 5, 0, 0);

const cards: Card[] = [
  {
    id: 'folder-1',
    title: 'Folder',
    cardType: 'folder',
    blocks: [],
    parentId: null,
    children: [
      {
        id: 'graph-1',
        title: 'Graph',
        cardType: 'graph',
        blocks: [{
          id: 'graph-block-1',
          type: 'graph',
          rows: 2,
          columns: 2,
          cells: [
            { text: 'A', color: '#ffffff' },
            { text: 'B', color: '#f1f5f9' },
            { text: 'C', color: '#ffffff' },
            { text: 'D', color: '#fef3c7' },
          ],
        }],
        parentId: 'folder-1',
        children: [],
        sortOrder: 1,
        createdAt: 100,
        updatedAt: 200,
        isDeleted: false,
      },
    ],
    sortOrder: 2,
    createdAt: 100,
    updatedAt: 200,
    isDeleted: false,
  },
];

const todoItems: TodoItem[] = [
  { id: 'todo-card-graph-1', type: 'card', cardId: 'graph-1' },
  { id: 'divider-1', type: 'divider', title: 'End of week' },
];

const backup = buildExportBackup(cards, '1.2.3', exportedAt, todoItems);
assert.deepEqual(Object.keys(backup), ['version', 'exportedAt', 'cards', 'todoCardIds', 'todoItems']);
assert.equal(backup.version, '1.2.3');
assert.equal(backup.exportedAt, exportedAt.toISOString());
assert.equal(backup.cards, cards);
assert.deepEqual(backup.todoCardIds, ['graph-1']);
assert.deepEqual(backup.todoItems, todoItems);

const json = stringifyExportBackup(backup);
assert.equal(json, JSON.stringify(backup, null, 2));
assert.equal(json.startsWith('{\n  "version": "1.2.3",\n  "exportedAt":'), true);
assert.deepEqual(JSON.parse(json), backup);
assert.equal(createExportFilename(exportedAt), 'notes-backup-2026-04-26_09-05.json');

const roundTripCards = getImportCards(JSON.parse(json));
assert.deepEqual(roundTripCards, cards);
assert.deepEqual(getImportTodoCardIds(JSON.parse(json)), ['graph-1']);
assert.deepEqual(getImportTodoItems(JSON.parse(json)), todoItems);
assert.deepEqual(getImportTodoCardIds({ cards }), []);
assert.deepEqual(getImportTodoItems({ cards }), []);
assert.deepEqual(getImportTodoCardIds({ todoItems, cards }), []);
assert.deepEqual(getImportTodoCardIds({ todoCardIds: ['graph-1'], cards }), ['graph-1']);

const importedWithMissingType = getImportCards({
  cards: [{
    id: 'graph-import',
    title: 'Imported Graph',
    blocks: [{
      id: 'graph-block-import',
      type: 'graph',
      rows: 1,
      columns: 1,
      cells: [{ text: 'Only cell', color: '#ffffff' }],
    }],
    parentId: null,
    children: [],
    sortOrder: 0,
    createdAt: 0,
    updatedAt: 0,
    isDeleted: false,
  }],
});

assert.equal(importedWithMissingType[0].cardType, 'graph');
const normalizedGraphBlock = importedWithMissingType[0].blocks[0];
assert.equal(normalizedGraphBlock.type, 'graph');
if (normalizedGraphBlock.type === 'graph') {
  assert.equal(normalizedGraphBlock.rows, 2);
  assert.equal(normalizedGraphBlock.columns, 2);
  assert.equal(normalizedGraphBlock.cells.length, 4);
}

const legacyImport = getImportCards({
  categories: [
    { id: 'cat-1', name: 'Legacy Folder', parentId: null, children: [] },
  ],
  cards: [
    {
      id: 'legacy-note-1',
      title: 'Legacy Note',
      categoryId: 'cat-1',
      content: 'Legacy body',
      createdAt: 10,
      updatedAt: 20,
      isDeleted: false,
    },
  ],
});

assert.equal(legacyImport.length, 1);
assert.equal(legacyImport[0].cardType, 'folder');
assert.equal(legacyImport[0].children.length, 1);
assert.equal(legacyImport[0].children[0].parentId, 'cat-1');
assert.equal(legacyImport[0].children[0].cardType, 'note');
assert.equal(legacyImport[0].children[0].blocks[0]?.type, 'text');
