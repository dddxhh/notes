import type { AttachmentType } from "../models/attachment";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const IMAGE_COMPRESS_THRESHOLD = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES: Record<AttachmentType, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  video: ["video/mp4", "video/webm", "video/ogg"],
  audio: ["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm"],
  file: [],
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  type: AttachmentType | null;
  needsCompress: boolean;
}

export function validateFile(file: File): FileValidationResult {
  const mimeType = file.type;
  const type = detectAttachmentType(mimeType);

  if (type === null) {
    return { valid: false, error: `Unsupported file type: ${mimeType}`, type: null, needsCompress: false };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds 50MB limit`, type, needsCompress: false };
  }

  const needsCompress = type === "image" && file.size > IMAGE_COMPRESS_THRESHOLD;

  return { valid: true, type, needsCompress };
}

export function detectAttachmentType(mimeType: string): AttachmentType | null {
  for (const [type, mimeTypes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (type === "file") continue;
    if (mimeTypes.includes(mimeType)) {
      return type as AttachmentType;
    }
  }
  return null;
}