# TypeScript 规范

> 本文档描述项目 TypeScript 使用约定，违反这些约定的代码在 typecheck / lint 中可能报错。

## tsconfig 严格模式

`tsconfig.base.json` 启用了 `strict: true`，包含：

- `strictNullChecks` — 可空类型必须显式标注。
- `noImplicitAny` — 禁止隐式 any。
- `strictFunctionTypes` — 函数类型严格协变。
- `isolatedModules` — 每个文件必须是独立模块，禁止跨文件 const enum 和非导出的类型推断依赖。

## 类型定义规则

### interface vs type

| 场景              | 用什么      | 示例                                                  |
| ----------------- | ----------- | ----------------------------------------------------- |
| 数据实体          | `interface` | `interface Note { id: string; ... }`                  |
| Props             | `interface` | `interface EditorProps { ... }`                       |
| Store 状态        | `interface` | `interface NotesState { ... }`                        |
| 字符串联合/枚举   | `type`      | `type NoteType = "markdown" \| "richtext"`            |
| 工具类型/派生类型 | `type`      | `type DeviceType = "mobile" \| "tablet" \| "desktop"` |

**规则**：实体/Props/State 用 `interface`，联合类型和工具类型用 `type`。不要反过来。

### 命名约定

| 模式       | 命名                            | 示例                                          |
| ---------- | ------------------------------- | --------------------------------------------- |
| 实体       | 名词                            | `Note`, `Folder`, `Tag`                       |
| 创建输入   | `Create<Entity>Input`           | `CreateNoteInput`                             |
| 更新输入   | `Update<Entity>Input`           | `UpdateNoteInput`                             |
| Props      | `<Component>Props`              | `EditorProps`                                 |
| Store 状态 | `<Name>State`                   | `NotesState`                                  |
| Hook 返回  | `<Hook>Result` 或自由命名       | `UploadResult`, `ResponsiveState`             |
| 枚举联合   | `<Entity>Type` / `<Entity>Mode` | `NoteType`, `AttachmentType`, `TagFilterMode` |

### 可空字段

- 可空持久化字段用 **`| null`**，不用 `| undefined`：`folderId: string | null`、`deletedAt: number | null`。
- Props 可选字段用 **`?`**：`currentNoteId?: string`。
- 时间戳用 **`number`**（`Date.now()` 毫秒），不用 `Date` 对象。

### Input 类型设计

- `CreateXxxInput`：必填字段必填，可选字段加 `?`，id 不在 Input 中（adapter 内部生成）。
- `UpdateXxxInput`：所有字段可选（显式定义，不直接用 `Partial<Xxx>`），以便独立控制哪些字段可更新。

## 导入规则

```typescript
import type { Note, NoteType } from "@notes/core";
import { createDefaultNote } from "@notes/core";
```

- 纯类型导入使用 **`import type`**。
- 值导入或混合导入使用 **`import`**。
- 不要用 `import * as`。

## Barrel 导出规则

```typescript
export type { Note, NoteType, CreateNoteInput } from "./note";
export { createDefaultNote } from "./note";
```

- 类型用 **`export type`**，值用 **`export`**，分开写。
- 这样确保消费方可以做 type-only import，有利于 tree-shaking。

## cross-package 类型访问

web 的 `tsconfig.json` 通过 `include` 引入了 core 的 `wa-sqlite-vfs.d.ts`：

```json
"include": ["src/**/*", "../core/src/storage/wa-sqlite-vfs.d.ts"]
```

如果新增 core 的 `.d.ts` 需要被 web 直接引用，需要在 web 的 tsconfig `include` 中显式添加。但优先做法是通过 core 的 barrel 导出，而非直接引用路径。
