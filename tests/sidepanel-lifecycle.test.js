const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(require.resolve('../sidepanel.js'), 'utf8');

assert.doesNotMatch(
  source,
  /window\.addEventListener\('pagehide',[\s\S]*?DISABLE_SELECTION_MODE_FOR_TAB/,
  'Closing the side panel must not disable selection mode for the active tab.'
);

console.log('sidepanel lifecycle tests passed');
