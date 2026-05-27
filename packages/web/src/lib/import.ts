import { DataDump } from "@notes/core";
import { unzipSync } from "fflate";
import { markdownToProseMirrorJSON } from "./markdown-serializer";

export type ImportFormat = "json" | "markdown-zip" | "markdown-files";

export function detectImportFormat(file: File): ImportFormat {
  if (file.name.endsWith(".json")) return "json";
  if (file.name.endsWith(".zip")) return "markdown-zip";
  if (file.name.endsWith(".md")) return "markdown-files";
  throw new Error(`不支持的文件格式: ${file.name}`);
}

export async function importJSON(file: File): Promise<DataDump> {
  const text = await file.text();
  const dump = JSON.parse(text) as DataDump;
  if (dump.version !== 1) {
    throw new Error(`备份版本不兼容: 期望 v1，实际 v${dump.version}`);
  }
  return dump;
}

export async function importMarkdownZip(file: File): Promise<DataDump> {
  const buffer = await file.arrayBuffer();
  const entries = unzipSync(new Uint8Array(buffer));

  let metadata: { tags?: { id: string; name: string }[]; folders?: any[] } | null = null;
  const folderNames = new Map<string, string>();
  const noteFiles: { path: string; content: string }[] = [];
  const attachmentFiles: { id: string; mimeType: string; data: Uint8Array }[] = [];
  const thumbnailFiles: { id: string; data: Uint8Array }[] = [];

  const decoder = new TextDecoder();

  for (const [path, data] of Object.entries(entries)) {
    if (path === "metadata.json") {
      try {
        metadata = JSON.parse(decoder.decode(data));
      } catch {}
    } else if (path.startsWith("attachments/thumbnails/")) {
      const id = path.split("/").pop()?.replace(".webp", "") ?? "";
      thumbnailFiles.push({ id, data });
    } else if (path.startsWith("attachments/")) {
      const filename = path.split("/").pop() ?? "";
      const id = filename.split(".")[0];
      const ext = filename.split(".")[1] ?? "";
      const mimeType = getMimeTypeFromExtension(ext);
      attachmentFiles.push({ id, mimeType, data });
    } else if (path.endsWith(".md")) {
      const content = decoder.decode(data);
      noteFiles.push({ path, content });
      const dirPath = path.substring(0, path.lastIndexOf("/"));
      if (dirPath) {
        const parts = dirPath.split("/");
        for (const part of parts) {
          if (part && !folderNames.has(part)) {
            folderNames.set(part, generateId());
          }
        }
      }
    }
  }

  const folders: DataDump["folders"] = [];
  const folderPathToId = new Map<string, string>();

  if (metadata && metadata.folders) {
    for (const f of metadata.folders) {
      folders.push({
        id: f.id,
        name: f.name,
        parentId: f.parentId ?? null,
        sortOrder: f.sortOrder ?? 0,
        createdAt: f.createdAt ?? Date.now(),
        updatedAt: f.updatedAt ?? Date.now(),
      });
      folderPathToId.set(f.name, f.id);
    }
  } else {
    for (const [name, id] of folderNames) {
      folders.push({
        id,
        name,
        parentId: null,
        sortOrder: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      folderPathToId.set(name, id);
    }
  }

  const folderIdMap = new Map<string, string>();

  if (metadata && metadata.folders) {
    const folderById = new Map<string, any>();
    for (const f of metadata.folders) {
      folderById.set(f.id, f);
      folderIdMap.set(f.id, f.id);
    }
    const folderPathById = new Map<string, string>();
    for (const f of metadata.folders) {
      let path = f.name;
      if (f.parentId) {
        const parentPath = folderPathById.get(f.parentId) ?? "";
        path = parentPath ? `${parentPath}/${path}` : path;
      }
      folderPathById.set(f.id, path);
    }
    for (const f of metadata.folders) {
      const path = folderPathById.get(f.id) ?? f.name;
      folderIdMap.set(path, f.id);
    }
  } else {
    for (const [name, id] of folderNames) {
      folderIdMap.set(name, id);
    }
  }

  const notes: DataDump["notes"] = [];
  const attachments: DataDump["attachments"] = [];
  const noteTags: DataDump["noteTags"] = [];
  const attachmentBlobs: DataDump["attachmentBlobs"] = [];
  const thumbnails: DataDump["thumbnails"] = [];
  const tags: DataDump["tags"] = [];

  if (metadata && metadata.tags) {
    for (const t of metadata.tags) {
      tags.push({ id: t.id, name: t.name });
    }
  }

  const tagNameToId = new Map<string, string>();
  if (metadata && metadata.tags) {
    for (const t of metadata.tags) {
      tagNameToId.set(t.name, t.id);
    }
  }

  for (const nf of noteFiles) {
    const noteId = generateId();
    const {
      content: strippedContent,
      frontmatterTags,
      createdAt,
      updatedAt,
    } = parseFrontmatter(nf.content);
    const title =
      extractTitle(strippedContent) || nf.path.split("/").pop()?.replace(".md", "") || noteId;
    const mdText = strippedContent;
    const contentJson = markdownToProseMirrorJSON(mdText);

    const dirPath = nf.path.substring(0, nf.path.lastIndexOf("/"));
    let folderId: string | null = null;
    if (dirPath) {
      folderId =
        folderIdMap.get(dirPath) ?? folderIdMap.get(dirPath.split("/").pop() ?? "") ?? null;
    }

    notes.push({
      id: noteId,
      title,
      contentJson,
      mdText,
      folderId,
      type: "markdown",
      createdAt,
      updatedAt,
      deletedAt: null,
      version: 1,
    });

    const allTags = new Set<string>(frontmatterTags);
    const inlineTagMatches = strippedContent.matchAll(/(?:^|\s)#([\w\u4e00-\u9fff]+)/g);
    for (const match of inlineTagMatches) {
      allTags.add(match[1]);
    }
    for (const tagName of allTags) {
      const tagId = tagNameToId.get(tagName) ?? `tag-${tagName}`;
      noteTags.push({ noteId, tagId });
      if (!tags.some((t) => t.id === tagId)) {
        if (tagNameToId.has(tagName)) {
          const original = metadata!.tags!.find((t) => t.id === tagId)!;
          tags.push({ id: tagId, name: original.name });
        } else {
          tags.push({ id: tagId, name: tagName });
        }
      }
    }
  }

  for (const af of attachmentFiles) {
    const noteId = notes.length > 0 ? notes[0].id : generateId();
    attachments.push({
      id: af.id,
      noteId,
      type: getAttachmentType(af.mimeType),
      filename: af.id + "." + getExtensionFromMimeType(af.mimeType),
      mimeType: af.mimeType,
      size: af.data.byteLength,
      createdAt: Date.now(),
    });
    attachmentBlobs.push({ id: af.id, mimeType: af.mimeType, data: uint8ArrayToBase64(af.data) });
  }

  for (const tf of thumbnailFiles) {
    thumbnails.push({ id: tf.id, data: uint8ArrayToBase64(tf.data) });
  }

  return {
    version: 1,
    exportedAt: Date.now(),
    folders,
    notes,
    tags,
    noteTags,
    attachments,
    attachmentBlobs,
    thumbnails,
  };
}

export async function importMarkdownFiles(files: File[]): Promise<DataDump> {
  const notes: DataDump["notes"] = [];
  const tags: DataDump["tags"] = [];
  const noteTags: DataDump["noteTags"] = [];

  for (const file of files) {
    const noteId = generateId();
    const rawText = await file.text();
    const {
      content: strippedContent,
      frontmatterTags,
      createdAt,
      updatedAt,
    } = parseFrontmatter(rawText);
    const title = extractTitle(strippedContent) || file.name.replace(".md", "");
    const mdText = strippedContent;
    const contentJson = markdownToProseMirrorJSON(mdText);

    notes.push({
      id: noteId,
      title,
      contentJson,
      mdText,
      folderId: null,
      type: "markdown",
      createdAt,
      updatedAt,
      deletedAt: null,
      version: 1,
    });

    const allTags = new Set<string>(frontmatterTags);
    const inlineTagMatches = strippedContent.matchAll(/(?:^|\s)#([\w\u4e00-\u9fff]+)/g);
    for (const match of inlineTagMatches) {
      allTags.add(match[1]);
    }
    for (const tagName of allTags) {
      const tagId = `tag-${tagName}`;
      noteTags.push({ noteId, tagId });
      if (!tags.some((t) => t.id === tagId)) {
        tags.push({ id: tagId, name: tagName });
      }
    }
  }

  return {
    version: 1,
    exportedAt: Date.now(),
    folders: [],
    notes,
    tags,
    noteTags,
    attachments: [],
    attachmentBlobs: [],
    thumbnails: [],
  };
}

function extractTitle(mdText: string): string {
  const match = mdText.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function parseFrontmatter(text: string): {
  content: string;
  frontmatterTags: string[];
  createdAt: number;
  updatedAt: number;
} {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match)
    return { content: text, frontmatterTags: [], createdAt: Date.now(), updatedAt: Date.now() };

  const frontmatter = match[1];
  const content = text.slice(match[0].length);

  const tags: string[] = [];
  let createdAt: number | null = null;
  let updatedAt: number | null = null;
  const lines = frontmatter.split(/\r?\n/);
  let inTagsSection = false;
  for (const line of lines) {
    if (line === "tags:" || line.match(/^tags:\s*\[/)) {
      inTagsSection = true;
      const inlineMatch = line.match(/^tags:\s*\[([^\]]*)\]/);
      if (inlineMatch) {
        for (const t of inlineMatch[1].split(",")) {
          const trimmed = t.trim().replace(/^["']|["']$/g, "");
          if (trimmed) tags.push(trimmed);
        }
        inTagsSection = false;
      }
      continue;
    }
    if (inTagsSection) {
      const itemMatch = line.match(/^\s*-\s+(.+)$/);
      if (itemMatch) {
        const val = itemMatch[1].trim().replace(/^["']|["']$/g, "");
        if (val) tags.push(val);
      } else if (line.trim() === "" || line.match(/^\S/)) {
        inTagsSection = false;
      }
    }
    const createdMatch = line.match(/^created:\s+(.+)$/);
    if (createdMatch) {
      createdAt = new Date(createdMatch[1].trim()).getTime();
    }
    const updatedMatch = line.match(/^updated:\s+(.+)$/);
    if (updatedMatch) {
      updatedAt = new Date(updatedMatch[1].trim()).getTime();
    }
  }
  return {
    content,
    frontmatterTags: tags,
    createdAt: createdAt ?? Date.now(),
    updatedAt: updatedAt ?? Date.now(),
  };
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getMimeTypeFromExtension(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    bin: "application/octet-stream",
  };
  return map[ext] ?? "application/octet-stream";
}

function getAttachmentType(mimeType: string): "image" | "video" | "audio" | "file" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "application/octet-stream": "bin",
  };
  return map[mimeType] ?? "bin";
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
