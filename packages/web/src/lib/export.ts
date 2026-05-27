import { DataDump } from "@notes/core";
import { zipSync } from "fflate";

function formatDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function exportAsJSON(dump: DataDump): void {
  const json = JSON.stringify(dump, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, `笔记-备份-${formatDate()}.json`);
}

export function exportAsMarkdownZip(dump: DataDump): void {
  const files: Record<string, Uint8Array> = {};

  const folderPathMap = new Map<string, string>();
  for (const folder of dump.folders) {
    let path = folder.name;
    if (folder.parentId) {
      const parentPath = folderPathMap.get(folder.parentId) ?? "";
      path = `${parentPath}/${folder.name}`;
    }
    folderPathMap.set(folder.id, path);
  }

  const usedFilenames = new Set<string>();
  for (const note of dump.notes) {
    let filename = sanitizeFilename(note.title || `笔记-${note.id.slice(0, 8)}`);
    if (usedFilenames.has(filename)) {
      filename = `${filename}-${note.id.slice(0, 8)}`;
    }
    usedFilenames.add(filename);

    const folderPath = note.folderId ? (folderPathMap.get(note.folderId) ?? "") : "";
    const mdPath = folderPath ? `${folderPath}/${filename}.md` : `${filename}.md`;

    const encoder = new TextEncoder();
    files[mdPath] = encoder.encode(note.mdText);
  }

  for (const ab of dump.attachmentBlobs) {
    const binary = atob(ab.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const ext = getExtensionFromMimeType(ab.mimeType);
    const attPath = `attachments/${ab.id}.${ext}`;
    files[attPath] = bytes;
  }

  for (const th of dump.thumbnails) {
    const binary = atob(th.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    files[`attachments/thumbnails/${th.id}.webp`] = bytes;
  }

  const zipped = zipSync(files);
  const blob = new Blob([zipped], { type: "application/zip" });
  downloadBlob(blob, `笔记-${formatDate()}.zip`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
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
  };
  return map[mimeType] ?? "bin";
}
