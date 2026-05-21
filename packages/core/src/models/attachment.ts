export type AttachmentType = "image" | "video" | "audio" | "file";

export interface Attachment {
  id: string;
  noteId: string;
  type: AttachmentType;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: number;
}