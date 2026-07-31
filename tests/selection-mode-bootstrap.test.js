const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(require.resolve('../background.js'), 'utf8');
const setSelectionMode = source.slice(source.indexOf('async function setSelectionMode'), source.indexOf('async function toggleSelectionMode'));

const persistEnabledState = setSelectionMode.indexOf("chrome.storage.session.set({ selectionModes: { ...data.selectionModes, [tabId]: true } })");
const deliverEnabledState = setSelectionMode.indexOf("await sendToContentScript(tabId, { type: 'SET_SELECTION_MODE', selectionMode: true })");

assert.ok(persistEnabledState >= 0, 'Enabling selection mode must persist a tab state.');
assert.ok(deliverEnabledState >= 0, 'Enabling selection mode must notify the content script.');
assert.ok(
  persistEnabledState < deliverEnabledState,
  'Persist enabled state before injecting or messaging the content script, otherwise its startup read can overwrite the enabled state with false.'
);

console.log('selection mode bootstrap tests passed');
