const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(require.resolve('../background.js'), 'utf8');
const setSelectionMode = source.slice(source.indexOf('async function setSelectionMode'), source.indexOf('async function toggleSelectionMode'));

const persistEnabledState = setSelectionMode.indexOf('chrome.storage.session.set({ [SELECTION_MODE_KEY]: nextSelectionMode })');
const deliverEnabledState = setSelectionMode.indexOf('await syncSelectionModeToTab(tabId, nextSelectionMode)');

assert.ok(persistEnabledState >= 0, 'Enabling selection mode must persist the shared state.');
assert.ok(deliverEnabledState >= 0, 'Enabling selection mode must synchronize the active content script.');
assert.ok(
  persistEnabledState < deliverEnabledState,
  'Persist shared selection state before synchronizing a content script, otherwise a refreshed page can bootstrap with false.'
);

console.log('selection mode bootstrap tests passed');
