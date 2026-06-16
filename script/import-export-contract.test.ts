import assert from 'node:assert/strict';
import {
  buildExportBackup,
  createExportFilename,
  getImportCards,
  stringifyExportBackup,
} from '../src/src/lib/import-export';
import type { Card } from '../src/src/lib/types';

const exportedAt = new Date(2026, 3, 26, 9, 5, 0, 0);

const cards: Card[] = [
  {
    id: 'folder-1',
    title: 'List',
    cardType: 'list',
    isTodoList: false,
    todoListColor: '#16a34a',
    todoListOrder: 500,
    blocks: [],
    parentId: null,
    children: [
      {
        id: 'graph-1',
        title: 'Graph',
        cardType: 'graph',
        isTodoList: false,
        todoListColor: null,
        todoListOrder: null,
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

const builtAt = '2026-04-26T16:05:00.000Z';
const backup = buildExportBackup(cards, builtAt, exportedAt);
assert.deepEqual(Object.keys(backup), ['builtAt', 'exportedAt', 'cards']);
assert.equal(backup.builtAt, builtAt);
assert.equal(backup.exportedAt, exportedAt.toISOString());
assert.equal(backup.cards, cards);

const json = stringifyExportBackup(backup);
assert.equal(json, JSON.stringify(backup, null, 2));
assert.equal(json.startsWith('{\n  "builtAt": "2026-04-26T16:05:00.000Z",\n  "exportedAt":'), true);
assert.deepEqual(JSON.parse(json), backup);
assert.equal(createExportFilename(exportedAt), 'notes-backup-2026-04-26_09-05.json');

const roundTripCards = getImportCards(JSON.parse(json));
assert.deepEqual(roundTripCards, cards);

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

const legacyMarkedListImport = getImportCards({
  cards: [{
    id: 'legacy-marked-list',
    title: 'Marked List',
    cardType: 'folder',
    isTodoList: true,
    todoListColor: '#2563eb',
    todoListOrder: 123,
    blocks: [],
    parentId: null,
    children: [],
    sortOrder: 0,
    createdAt: 0,
    updatedAt: 0,
    isDeleted: false,
  }],
});

assert.equal(legacyMarkedListImport[0].cardType, 'list');
assert.equal(legacyMarkedListImport[0].isTodoList, false);
assert.equal(legacyMarkedListImport[0].todoListColor, '#2563eb');
assert.equal(legacyMarkedListImport[0].todoListOrder, 123);
