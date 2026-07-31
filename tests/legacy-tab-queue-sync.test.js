const assert = require('node:assert/strict');
const fs = require('node:fs');

const background = fs.readFileSync(require.resolve('../background.js'), 'utf8');

assert.match(
  background,
  /chrome\.storage\.onChanged\.addListener/,
  'The background worker must observe writes from content scripts that were already running before an extension reload.'
);
assert.match(
  background,
  /area !== 'local' \|\| !changes\[PAGE_STORAGE_KEY\]\?\.newValue/,
  'A legacy content script writing local highlights must be detected.'
);
assert.match(
  background,
  /syncLegacyTabHighlights\(changes\[PAGE_STORAGE_KEY\]\.newValue\)/,
  'Legacy local highlights must be synchronized into the current clip queue.'
);
assert.match(
  background,
  /type: 'CLIP_QUEUE_CHANGED'/,
  'Queue conversion must notify the side panel immediately.'
);

console.log('legacy tab queue sync tests passed');
