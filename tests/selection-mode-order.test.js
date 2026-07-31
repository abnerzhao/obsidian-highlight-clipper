const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(require.resolve('../background.js'), 'utf8');
const setSelectionMode = source.slice(source.indexOf('async function setSelectionMode'), source.indexOf('async function toggleSelectionMode'));

assert.ok(
  setSelectionMode.indexOf('chrome.storage.session.set') < setSelectionMode.indexOf('await syncSelectionModeToTab'),
  'Selection mode must persist before content-script delivery so a newly injected script reads the enabled state.'
);

console.log('selection mode order tests passed');
