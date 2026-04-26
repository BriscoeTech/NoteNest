import assert from 'node:assert/strict';
import {
  CARD_TYPE_LABELS,
  CARD_TYPE_ORDER,
  cardTypeOpensOnCreate,
  cardTypeUsesCreateFilePicker,
  cardTypeCanHaveChildren,
  createInitialBlocksForCardType,
  getCardTypeDefinition,
  getTypedBlocksByCardType,
  ensureCardBlocksForTypeChange,
  getVisibleBlocksByCardType,
  inferCardTypeFromCardData,
} from '../src/src/lib/card-types';
import {
  BLOCK_TYPES,
  blockMatchesSearch,
  normalizeContentBlock,
} from '../src/src/lib/block-types';
import type { Card, CardType, ContentBlock } from '../src/src/lib/types';

const expectedOrder: CardType[] = ['note', 'checkbox', 'link', 'image', 'drawing', 'graph', 'folder'];

assert.deepEqual(CARD_TYPE_ORDER, expectedOrder);

for (const type of expectedOrder) {
  assert.equal(typeof CARD_TYPE_LABELS[type], 'string');
  assert.ok(CARD_TYPE_LABELS[type].length > 0);
}

const makeCard = (type: CardType, blocks: Card['blocks'] = [], children: Card[] = []): Card => ({
  id: `card-${type}`,
  title: type,
  cardType: type,
  blocks,
  parentId: null,
  children,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
  isDeleted: false,
});

assert.equal(cardTypeCanHaveChildren('folder'), true);
for (const type of expectedOrder.filter((type) => type !== 'folder')) {
  assert.equal(cardTypeCanHaveChildren(type), false);
}
assert.equal(cardTypeUsesCreateFilePicker('image'), true);
assert.equal(cardTypeUsesCreateFilePicker('note'), false);
assert.equal(cardTypeOpensOnCreate('drawing'), true);
assert.equal(cardTypeOpensOnCreate('graph'), true);
assert.equal(cardTypeOpensOnCreate('note'), false);

assert.equal(createInitialBlocksForCardType('note').length, 0);
assert.equal(createInitialBlocksForCardType('folder').length, 0);
assert.equal(createInitialBlocksForCardType('image').length, 0);
assert.equal(createInitialBlocksForCardType('image', { imageDataUrl: 'data:image/png;base64,x' })[0]?.type, 'image');
assert.equal(createInitialBlocksForCardType('checkbox')[0]?.type, 'checkbox');
assert.equal(createInitialBlocksForCardType('link')[0]?.type, 'link');
assert.equal(createInitialBlocksForCardType('drawing')[0]?.type, 'drawing');
assert.equal(createInitialBlocksForCardType('graph')[0]?.type, 'graph');

assert.equal(ensureCardBlocksForTypeChange(makeCard('note'), 'note')[0]?.type, 'text');
assert.equal(ensureCardBlocksForTypeChange(makeCard('checkbox'), 'checkbox')[0]?.type, 'checkbox');
assert.equal(ensureCardBlocksForTypeChange(makeCard('link'), 'link')[0]?.type, 'link');
assert.equal(ensureCardBlocksForTypeChange(makeCard('drawing'), 'drawing')[0]?.type, 'drawing');
assert.equal(ensureCardBlocksForTypeChange(makeCard('graph'), 'graph')[0]?.type, 'graph');
assert.deepEqual(ensureCardBlocksForTypeChange(makeCard('image'), 'image'), []);
assert.deepEqual(ensureCardBlocksForTypeChange(makeCard('folder'), 'folder'), []);

assert.equal(getVisibleBlocksByCardType(makeCard('note', [{ id: 'text', type: 'text', content: '' }])).length, 1);
assert.equal(getVisibleBlocksByCardType(makeCard('folder')).length, 0);
assert.equal(getTypedBlocksByCardType(makeCard('checkbox', [{ id: 'check', type: 'checkbox', checked: false }])).checkboxBlock?.type, 'checkbox');
assert.equal(getTypedBlocksByCardType(makeCard('link', [{ id: 'link', type: 'link', url: '' }])).linkBlock?.type, 'link');
assert.equal(getCardTypeDefinition('image').emptyGridMessage, 'No image yet');
assert.equal(getCardTypeDefinition('drawing').needsDrawingPreviewContext, true);

const folderGridLayout = getCardTypeDefinition('folder').getGridLayout({
  hasCheckboxBlock: false,
  inlineChildren: true,
  isRecycleBin: false,
  visibleChildrenCount: 1,
  nestingDepth: 0,
});
assert.equal(folderGridLayout.canHaveChildren, true);
assert.equal(folderGridLayout.showInlineChildren, true);
assert.equal(folderGridLayout.shouldSpanWide, true);

const imageGridLayout = getCardTypeDefinition('image').getGridLayout({
  hasCheckboxBlock: false,
  inlineChildren: false,
  isRecycleBin: false,
  visibleChildrenCount: 0,
  nestingDepth: 0,
});
assert.equal(imageGridLayout.isMediaCard, true);
assert.equal(imageGridLayout.emptyMessage, 'No image yet');

assert.equal(inferCardTypeFromCardData({ blocks: [{ id: 'check', type: 'checkbox', checked: false }], children: [] }), 'checkbox');
assert.equal(inferCardTypeFromCardData({ blocks: [{ id: 'graph', type: 'graph', rows: 2, columns: 2, cells: [] }], children: [] }), 'graph');
assert.equal(inferCardTypeFromCardData({ blocks: [], children: [makeCard('note')] }), 'folder');
assert.equal(inferCardTypeFromCardData({ blocks: [], children: [] }), 'note');

const expectedBlockOrder: ContentBlock['type'][] = ['text', 'bullets', 'image', 'checkbox', 'link', 'drawing', 'graph'];
assert.deepEqual(BLOCK_TYPES.map((definition) => definition.type), expectedBlockOrder);
assert.equal(blockMatchesSearch({ id: 'text', type: 'text', content: 'Find Me' }, 'find'), true);
assert.equal(blockMatchesSearch({ id: 'bullets', type: 'bullets', items: [{ id: 'item', content: 'Nested Hit', indent: 0 }] }, 'hit'), true);
assert.equal(blockMatchesSearch({
  id: 'graph',
  type: 'graph',
  rows: 2,
  columns: 2,
  cells: [{ text: 'Grid Hit', color: '#fff' }],
}, 'grid'), true);

const normalizedGraph = normalizeContentBlock({
  id: 'graph',
  type: 'graph',
  rows: 2,
  columns: 2,
  cells: [],
});
assert.equal(normalizedGraph.type, 'graph');
if (normalizedGraph.type === 'graph') {
  assert.equal(normalizedGraph.cells.length, 4);
}
