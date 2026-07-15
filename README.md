# Obsidian Highlight Clipper

一个 Manifest V3 Chrome 扩展：网页内多处高亮，统一复制为 Markdown 后粘贴进 Obsidian。

## 使用

1. 打开 `chrome://extensions`，开启开发者模式，选择「加载已解压的扩展程序」。
2. 选择本项目目录。
3. 在网页内按 `Control + Shift + H`（macOS）或 `Alt + Shift + H`（其他平台）进入高亮选择模式；此后鼠标选中即高亮，再按一次退出。
4. 点击扩展图标，在 Popup 中设置保存位置，或点击「打开本页剪藏」查看侧栏并保存到 Obsidian。

## 当前限制

- 高亮仅保存文本，不会在刷新后重新定位、还原页面标记。
- 默认日志使用 `obsidian://daily`，自定义文件使用 `obsidian://new`；保存内容以追加方式写入，需要系统已安装并可唤起 Obsidian。「复制」按钮可作为兜底。
- 首次唤起 Obsidian 时，Chrome 可能出于安全策略要求确认；该系统级确认无法由扩展跳过，确认后不会打开额外的 Chrome 标签页。
