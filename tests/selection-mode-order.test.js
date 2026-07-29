const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(require.resolve('../background.js'), 'utf8');
const setSelectionMode = source.slice(source.indexOf('async function setSelectionMode'), source.indexOf('async function toggleSelectionMode'));

assert.ok(
  setSelectionMode.indexOf('await sendToContentScript') < setSelectionMode.indexOf('chrome.storage.session.set'),
  'Selection mode must update storage only after content-script delivery succeeds.'
);

console.log('selection mode order tests passed');
