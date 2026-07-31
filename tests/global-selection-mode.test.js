const assert = require('node:assert/strict');
const fs = require('node:fs');

const background = fs.readFileSync(require.resolve('../background.js'), 'utf8');
const content = fs.readFileSync(require.resolve('../content.js'), 'utf8');
const sidepanel = fs.readFileSync(require.resolve('../sidepanel.js'), 'utf8');

assert.match(background, /const SELECTION_MODE_KEY = 'selectionModeEnabled'/, 'Selection mode must have one session-wide source of truth.');
assert.match(background, /message\.type === 'TOGGLE_SELECTION_MODE'/, 'Keyboard and side-panel controls must toggle the shared mode.');
assert.doesNotMatch(background, /chrome\.tabs\.onActivated[\s\S]*?setSelectionMode\(tabId, true\)/, 'Activating a tab must synchronize state, not force-enable and rewrite user intent.');
assert.match(content, /GET_SELECTION_MODE/, 'A refreshed document must bootstrap from the shared selection mode.');
assert.match(content, /SELECTION_MODE_CHANGED/, 'Open documents must receive shared mode changes.');
assert.match(sidepanel, /selectionModeEnabled/, 'The side panel must render the shared selection mode.');

console.log('global selection mode tests passed');
