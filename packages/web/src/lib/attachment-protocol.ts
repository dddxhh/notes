export const ATTACHMENT_PROTOCOL = "attachment://";

const objectUrlCache = new Map<string, string>();

export function createAttachmentSrc(attachmentId: string): string {
  return ATTACHMENT_PROTOCOL + attachmentId;
}

export function isAttachmentSrc(src: string): boolean {
  return src.startsWith(ATTACHMENT_PROTOCOL);
}

export function parseAttachmentId(src: string): string | null {
  if (!isAttachmentSrc(src)) return null;
  return src.slice(ATTACHMENT_PROTOCOL.length);
}

export async function resolveAttachmentSrc(
  src: string,
  getBlob: (id: string) => Promise<Blob | null>,
): Promise<string | null> {
  if (!isAttachmentSrc(src)) return src;

  const id = parseAttachmentId(src)!;

  if (objectUrlCache.has(id)) return objectUrlCache.get(id)!;

  const blob = await getBlob(id);
  if (!blob) return null;

  const objectUrl = URL.createObjectURL(blob);
  objectUrlCache.set(id, objectUrl);
  return objectUrl;
}

export function revokeAttachmentObjectUrl(attachmentId: string): void {
  const url = objectUrlCache.get(attachmentId);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(attachmentId);
  }
}

export function revokeAllObjectUrls(): void {
  for (const url of objectUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  objectUrlCache.clear();
}
