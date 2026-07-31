const assert = require('node:assert/strict');
const fs = require('node:fs');

const background = fs.readFileSync(require.resolve('../background.js'), 'utf8');
const sidepanel = fs.readFileSync(require.resolve('../sidepanel.js'), 'utf8');
const content = fs.readFileSync(require.resolve('../content.js'), 'utf8');

assert.doesNotMatch(
  background,
  /chrome\.tabs\.onUpdated[\s\S]*?disableSelectionMode/,
  'Page navigation must not clear a tab selection mode after activation.'
);
assert.match(
  sidepanel,
  /TOGGLE_SELECTION_MODE_FOR_TAB', tabId: activeTab\.id/,
  'The side panel must toggle the tab it is currently displaying.'
);
assert.doesNotMatch(
  sidepanel,
  /tabs\.query\(\{ active: true, lastFocusedWindow: true \}\)/,
  'Side-panel refresh must not rely on lastFocusedWindow after tab activation.'
);
assert.match(
  sidepanel,
  /chrome\.tabs\.onActivated\.addListener\(\(\{ tabId \}\) => refresh\(tabId\)\)/,
  'Tab activation must refresh the side panel with the activated tab ID.'
);
assert.match(
  content,
  /type: 'CLIP_QUEUE_UPDATED'/,
  'Saving a highlight must explicitly notify the extension UI.'
);
assert.match(
  background,
  /message\.type === 'CLIP_QUEUE_UPDATED'/,
  'The background worker must relay clip-queue updates.'
);
assert.match(
  sidepanel,
  /message\.type === 'CLIP_QUEUE_CHANGED'/,
  'The side panel must refresh when a clip-queue update is relayed.'
);

console.log('tab selection lifecycle tests passed');
