# 样式规范

> 本文档描述项目的样式架构和用法约定。

## 主题系统

颜色全部通过 CSS 自定义属性定义，不使用 Tailwind 的 `text-blue-500` 等硬编码色值：

| 变量                                                      | 用途         |
| --------------------------------------------------------- | ------------ |
| `--bg-primary` / `--bg-secondary` / `--bg-tertiary`       | 层级背景     |
| `--text-primary` / `--text-secondary` / `--text-tertiary` | 层级文字     |
| `--border-color`                                          | 边框         |
| `--accent` / `--accent-hover` / `--accent-alpha`          | 强调色       |
| `--danger`                                                | 危险色       |
| `--code-bg`                                               | 代码块背景   |
| `--sidebar-bg` / `--card-bg` / `--hover-bg`               | 特定区域背景 |

深色模式通过 `.dark` 类切换（`<html>` 上，即 `documentElement`），与 Tailwind `darkMode: "class"` 一致。变量在 `globals.css` 的 `:root` 和 `.dark` 中分别定义。

**规则**：新增颜色必须添加对应的 CSS 变量并在 `:root` 和 `.dark` 中同时定义。不要用 Tailwind 硬编码色值。

## 混合样式写法

```tsx
<div
  className="flex items-center p-2 border-b"
  style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
>
```

- **Tailwind** 用于布局、间距、排版、flex/grid 等结构性样式。
- **CSS 变量（inline style）** 用于需要主题切换的颜色。
- 不要在 Tailwind class 中写颜色（如 `text-gray-500`），除非是明确不需要主题切换的装饰色。

## CSS 文件组织

- `styles/index.css` — 入口，仅 `@import "./globals.css"`。
- `styles/globals.css` — 全局唯一 CSS 文件，包含：
  - Tailwind 指令（`@tailwind base/components/utilities`）。
  - CSS 变量定义（`:root` + `.dark`）。
  - ProseMirror 编辑器样式（`.ProseMirror` 前缀）。
  - Toast、Slash Command、上传按钮等组件的专用样式。
  - Highlight.js 语法高亮色（也通过 CSS 变量适配主题）。

**规则**：

- 不创建新 CSS 文件，全局样式都写在 `globals.css` 中。
- ProseMirror 编辑器样式用 `.ProseMirror` 选择器前缀，不在组件中写 inline style。
- 组件级样式优先用 Tailwind + CSS 变量 inline，只有复杂或重复的样式才提取到 `globals.css`。

## Tailwind 配置

`tailwind.config.js` 极简：仅 `darkMode: "class"` + `content` 扫描路径，无自定义扩展、无插件。

**规则**：不要扩展 Tailwind 自定义主题（颜色、字体、间距等），这些需求通过 CSS 变量满足。

## 深色模式切换

`useTheme` hook 管理 `document.documentElement.classList` 的 `dark` 类。读取主题从 `uiStore.theme`（`"light" | "dark"`）。

```typescript
const { theme } = useTheme();
// hook 内部：document.documentElement.classList.toggle("dark", theme === "dark");
```

**规则**：组件不直接操作 `document.body.classList`，通过 `useTheme` 或 `uiStore.setTheme` 切换主题。
