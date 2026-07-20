const assert = require('node:assert/strict');
const { build, resolveFilePath } = require('../obsidian-uri.js');

const date = new Date(2026, 6, 20);
assert.equal(resolveFilePath('Inbox/{{YYYY/MM/DD}} Highlights.md', date), 'Inbox/2026/07/20 Highlights.md');
assert.equal(
  build({ saveMode: 'custom', vaultName: 'My Vault', customFile: 'Inbox/{{YYYY-MM-DD}} Highlights.md', content: '> A clip', date }),
  'obsidian://new?vault=My%20Vault&file=Inbox%2F2026-07-20%20Highlights.md&append=true&content=%3E%20A%20clip'
);
assert.equal(
  build({ saveMode: 'daily', vaultName: 'My Vault', content: '> A clip', date }),
  'obsidian://daily?vault=My%20Vault&append=true&content=%3E%20A%20clip'
);
assert.throws(() => build({ saveMode: 'custom', vaultName: '', customFile: 'Inbox/Clips.md', content: '> A clip', date }), /VAULT_NAME_REQUIRED/);

console.log('obsidian-uri tests passed');
