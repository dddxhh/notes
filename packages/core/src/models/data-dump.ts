import { Note } from "./note";
import { Folder } from "./folder";
import { Tag } from "./tag";
import { Attachment } from "./attachment";

export interface DataDump {
  version: 1;
  exportedAt: number;
  folders: Folder[];
  notes: Note[];
  tags: Tag[];
  noteTags: { noteId: string; tagId: string }[];
  attachments: Attachment[];
  attachmentBlobs: { id: string; mimeType: string; data: string }[];
  thumbnails: { id: string; data: string }[];
}
