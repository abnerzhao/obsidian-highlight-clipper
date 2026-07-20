# Obsidian Highlight Clipper

[中文](README.md)

Highlight what matters on the web, then save it to Obsidian.

## Showcase

### Highlight and collect

![Highlight passages and collect them in the side panel](store-assets/highlight-and-collect.png)

### Make it yours

![Customize save location and highlight appearance](store-assets/customize-settings.png)

### Save to Obsidian

![Save collected highlights to Obsidian](store-assets/save-to-obsidian.png)

## Features

- Uses Chrome's native Side Panel, so it never overlays or changes the webpage layout.
- Supports multiple highlights per page, ordered by their position in the article.
- Saves all clippings as Markdown blockquotes to an Obsidian daily note or custom file.
- Supports English and Simplified Chinese UI.
- Supports sidebar themes: follow browser, sand, light, and dark.

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode**, then choose **Load unpacked**.
3. Select this project directory.
4. Click the extension icon to enable selection mode and open the sidebar.

## Usage

- Press `Control + Shift + H` on macOS, or `Alt + Shift + H` on Windows/Linux, to toggle selection mode. When enabled, selecting text creates a highlight.
- Use the gear icon in the sidebar to configure the save location, source link, appearance, and language.
- The sidebar keeps highlights scoped to the active page. Selection mode is scoped to each tab.

### Custom file date variables

Custom file paths may use the following local-date variables:

- `{{YYYY}}`
- `{{MM}}`
- `{{DD}}`
- `{{YYYY-MM-DD}}`
- `{{YYYY/MM/DD}}`

For example: `Inbox/{{YYYY/MM/DD}} Highlights.md`.

For custom files, also set the Obsidian vault name in Settings so clippings are written to the intended vault.

## Notes

- Highlights save text only; they are not restored to their original page positions after a refresh.
- Daily notes use `obsidian://daily`; custom files use `obsidian://new`. Obsidian must be installed and registered to handle `obsidian://` links.
- Chrome may require confirmation the first time it opens Obsidian. The **Copy** button is available as a fallback.
