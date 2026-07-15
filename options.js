const notePath = document.querySelector('#notePath');
const includeSource = document.querySelector('#includeSource');
const status = document.querySelector('#status');

chrome.storage.sync.get({ notePath: 'Inbox/Web Highlights', includeSource: true }).then((settings) => {
  notePath.value = settings.notePath;
  includeSource.checked = settings.includeSource;
});

document.querySelector('#save').addEventListener('click', async () => {
  await chrome.storage.sync.set({ notePath: notePath.value.trim(), includeSource: includeSource.checked });
  status.textContent = '已保存';
  setTimeout(() => { status.textContent = ''; }, 1500);
});
