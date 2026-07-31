const assert = require('node:assert/strict');
const fs = require('node:fs');

const background = fs.readFileSync(require.resolve('../background.js'), 'utf8');
const sidepanel = fs.readFileSync(require.resolve('../sidepanel.js'), 'utf8');

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

console.log('tab selection lifecycle tests passed');
