const assert = require('node:assert/strict');
const ClipQueue = require('../clip-queue.js');

const first = { id: 'a', text: 'First', createdAt: '2026-07-27T01:00:00.000Z' };
const second = { id: 'b', text: 'Second', createdAt: '2026-07-27T02:00:00.000Z' };
const queue = ClipQueue.syncPage([second], [first], 'https://example.com/a', 'Example A');
assert.deepEqual(queue.map((item) => item.id), ['a', 'b']);
assert.equal(queue[0].pageTitle, 'Example A');

const removed = ClipQueue.remove(queue, {
  'https://example.com/a': [first],
  'https://example.com/b': [second]
}, 'a');
assert.deepEqual(removed.queue.map((item) => item.id), ['b']);
assert.deepEqual(Object.keys(removed.highlightsByPage), ['https://example.com/b']);

const migrated = ClipQueue.fromLegacy({
  'https://example.com/b': [second],
  'https://example.com/a': [first]
});
assert.deepEqual(migrated.map((item) => item.id), ['a', 'b']);

console.log('clip-queue tests passed');
