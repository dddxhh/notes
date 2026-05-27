import {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  Folder,
  CreateFolderInput,
  UpdateFolderInput,
  Attachment,
  AttachmentType,
  Tag,
  UpdateTagInput,
  SearchInput,
  SearchResult,
} from "../models";
import { DataDump } from "../models/data-dump";

export interface StorageAdapter {
  init(): Promise<void>;
  close(): Promise<void>;

  createNote(input: CreateNoteInput): Promise<Note>;
  updateNote(id: string, input: UpdateNoteInput): Promise<Note>;
  deleteNote(id: string): Promise<void>;
  permanentlyDeleteNote(id: string): Promise<void>;
  getNote(id: string): Promise<Note | null>;
  listNotes(folderId?: string, tagId?: string): Promise<Note[]>;

  createFolder(input: CreateFolderInput): Promise<Folder>;
  updateFolder(id: string, input: UpdateFolderInput): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;
  listFolders(parentId?: string | null): Promise<Folder[]>;
  updateNotesFolderId(oldFolderId: string, newFolderId: string | null): Promise<void>;
  softDeleteNotesByFolder(folderId: string): Promise<void>;

  saveAttachment(noteId: string, file: File, type: AttachmentType): Promise<Attachment>;
  getAttachmentBlob(id: string): Promise<Blob | null>;
  getAttachmentThumbnail(id: string): Promise<Blob | null>;
  deleteAttachment(id: string): Promise<void>;
  listAttachmentIds(): Promise<string[]>;

  searchNotes(input: SearchInput): Promise<SearchResult>;

  createTag(name: string): Promise<Tag>;
  updateTag(id: string, input: UpdateTagInput): Promise<Tag>;
  addTagToNote(noteId: string, tagId: string): Promise<void>;
  addTagsToNote(noteId: string, tagIds: string[]): Promise<void>;
  removeTagFromNote(noteId: string, tagId: string): Promise<void>;
  removeTagsFromNote(noteId: string, tagIds: string[]): Promise<void>;
  getTagsForNote(noteId: string): Promise<Tag[]>;
  listTags(): Promise<Tag[]>;
  deleteTag(id: string): Promise<void>;
  getNotesForTag(tagId: string): Promise<Note[]>;

  dumpAll(): Promise<DataDump>;
  restoreAll(dump: DataDump): Promise<void>;
}
