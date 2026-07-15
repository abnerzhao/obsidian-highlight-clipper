# Obsidian Highlighter

一个 Manifest V3 Chrome 扩展：网页内多处高亮，统一复制为 Markdown 后粘贴进 Obsidian。

## 使用

1. 打开 `chrome://extensions`，开启开发者模式，选择「加载已解压的扩展程序」。
2. 选择本项目目录。
3. 在网页内选中文字，按 `Control + Shift + H`（macOS）或 `Alt + Shift + H`（其他平台）。
4. 点击扩展图标查看全部高亮，点击「保存到 Obsidian」。默认笔记位置可在扩展的「选项」中设置。

## 当前限制

- 高亮仅保存文本，不会在刷新后重新定位、还原页面标记。
- 通过 `obsidian://new` URI Scheme 新建笔记，需要系统已安装并可唤起 Obsidian；「复制」按钮可作为兜底。
