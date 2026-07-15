# Obsidian Highlighter

一个 Manifest V3 Chrome 扩展：网页内多处高亮，统一复制为 Markdown 后粘贴进 Obsidian。

## 使用

1. 打开 `chrome://extensions`，开启开发者模式，选择「加载已解压的扩展程序」。
2. 选择本项目目录。
3. 在网页内选中文字，按 `Control + Shift + H`（macOS）或 `Alt + Shift + H`（其他平台）。
4. 点击扩展图标查看本页全部高亮，点击「保存到 Obsidian」。在扩展的「选项」中可选择 Obsidian 默认日志文件，或填写自定义 Markdown 文件路径。

## 当前限制

- 高亮仅保存文本，不会在刷新后重新定位、还原页面标记。
- 默认日志使用 `obsidian://daily`，自定义文件使用 `obsidian://new`；保存内容以追加方式写入，需要系统已安装并可唤起 Obsidian。「复制」按钮可作为兜底。
