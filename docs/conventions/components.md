# 组件使用规范

> 本文档描述 web 包的 React 组件、Hook、Store 和 Lib 的使用模式，新代码应遵循。

## 组件

### 目录结构

```
components/
  desktop/    -- 桌面端专属组件（Sidebar、FolderTree、FolderTreeDropdown）
  mobile/     -- 移动端专属组件（MobileDrawer、MobileFAB、MobileSearch 等）
  shared/     -- 双端共用组件（Editor、EditorToolbar、Toast、SearchBar、SearchFilterPanel、SearchResultList 等）
  layouts/    -- 布局壳（DesktopLayout、MobileLayout）
```

新组件按使用场景放入对应目录。不确定时放 `shared/`。

### 定义规范

```typescript
interface XxxProps {
  requiredField: string;
  optionalField?: boolean;
}

export default function Xxx({ requiredField, optionalField }: XxxProps) {
  // ...
}
```

- Props 用 **`interface`**，不用 `type`。命名 `<ComponentName>Props`。
- 组件用 **`export default function`**，不用 `React.FC`、不用箭头函数。
- Props 在函数签名中解构。
- 可选字段用 `?`，不使用 `| undefined`。

### 导入规范

```typescript
import { useNotesStore, useUIStore } from "../../stores";
import { useStorage } from "../../hooks";
import type { Note } from "@notes/core";
import { Note, createDefaultNote } from "@notes/core";
import Sidebar from "../desktop/Sidebar";
```

- Store / Hook / Lib 通过 barrel 导入。
- core 纯类型用 `import type`。
- 子组件用相对路径的 default import。

### Store 选择器

```typescript
const notes = useNotesStore((s) => s.notes);
const isMobile = useUIStore((s) => s.isMobile);
```

永远用箭头选择器，不要 `useNotesStore()` 解构整个 store（会导致不必要的重渲染）。

### Sidebar 搜索/筛选集成

桌面端 Sidebar 的笔记列表通过 `finalNotes` 综合多重筛选源：

```
finalNotes = activeNotes
  ∩ tagFilteredNoteIds（侧栏标签点击 → getNotesForTag）
  ∩ client-side query（searchInput.query → title/mdText includes）
  ∩ client-side folder（searchInput.folderId）
  ∩ searchResultIds（useSearch result → 数据库 FTS5 搜索结果）
```

- **`useSearch` hook** 管理 `searchInput` 和 `result` 状态，通过 `updateFilter` 合并部分筛选条件并触发 `executeSearch`。
- **客户端筛选**（query、folderId）即时生效，不依赖异步数据库搜索，作为可靠兜底。
- **数据库搜索结果**（searchResultIds）与客户端筛选交叉过滤，确保精确匹配。
- **SearchFilterPanel** 通过 `showFilter` 状态条件渲染，`onFilterChange` 连接 `updateFilter`。

移动端 `MobileSearch` 使用不同的模式：不复用侧栏笔记列表，而是直接用 `SearchResultList` 渲染 `result`。

## Store 使用

### 定义规范

```typescript
interface NotesState {
  notes: Note[];
  currentNote: Note | null;
  loading: boolean;
  // actions
  setNotes: (notes: Note[]) => void;
  loadDeletedNotes: () => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  currentNote: null,
  loading: false,
  setNotes: (notes) => set({ notes }),
  loadDeletedNotes: async () => {
    const storage = getStorage();
    const deleted = await storage.listNotes({ deletedOnly: true });
    set({ deletedNotes: deleted });
  },
}));
```

- 状态接口命名 `<Name>State`。
- Store hook 命名 `use<Name>Store`。
- 简单同步 mutation 用 `set({ field })`。
- 异步 action 内通过 `getStorage()` 直接访问存储层。
- State 和 actions 写在同一个 `create` 回调里。

### Store vs Hook vs Adapter 的分工

| 层              | 责责                        | 依赖                       |
| --------------- | --------------------------- | -------------------------- |
| adapter         | 持久化读写                  | 无 React                   |
| store           | 缓存 + UI 状态              | adapter（通过 getStorage） |
| useStorage hook | 桥接 adapter 为 useCallback | adapter（通过 getStorage） |

**规则**：组件通过 store 或 hook 访问数据，不直接调用 `getStorage()`（除非在 store 的异步 action 中）。

## Hook 使用

### 定义规范

```typescript
export function useXxx(param: string): XxxResult {
  const callback = useCallback(async () => {
    const storage = getStorage();
    // ...
  }, []);

  return { callback };
}
```

- Hook 用 **命名函数** `export function useXxx`，不用箭头函数。
- 返回对象（具名属性），不返回原始值。
- 关联类型导出为 `export interface XxxResult`。
- `useCallback` 依赖为 `[]`（因为 `getStorage()` 是稳定单例 getter）。

### 参数化 Hook

部分 Hook 需参数（如 `useAttachmentUpload(noteId)`、`useAttachmentRenderer(src)`），参数从组件 props 传入，不从 context 读取。

## Lib 使用

`lib/` 下是非 React 的纯工具模块：

- `sqlite-init.ts` — 存储初始化，提供 `getStorage()` 单例。
- `attachment-protocol.ts` — `attachment://` URI 方案。
- `markdown-serializer.ts` — ProseMirror ↔ Markdown 双向转换。
- `CustomImage.ts` / `CustomVideo.ts` — TipTap 节点扩展。
- `tiptap-setup.ts` — 编辑器扩展组合。
- `dompurify-setup.ts` — HTML 清理配置。

**规则**：lib 模块不依赖 React，不导入 stores/hooks。如果新工具需要 React，放到 `hooks/`。
