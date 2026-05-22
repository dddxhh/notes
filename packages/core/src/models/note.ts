export type NoteType = "text" | "markdown" | "rich";

export interface Note {
  id: string;
  title: string;
  contentJson: string;
  mdText: string;
  folderId: string | null;
  type: NoteType;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  version: number;
}

export interface CreateNoteInput {
  title: string;
  contentJson?: string;
  mdText?: string;
  folderId?: string | null;
  type?: NoteType;
}

export interface UpdateNoteInput {
  title?: string;
  contentJson?: string;
  mdText?: string;
  folderId?: string | null;
  type?: NoteType;
  deletedAt?: number | null;
}

export function createDefaultNote(input: CreateNoteInput): Note {
  return {
    id: "",
    title: input.title,
    contentJson: input.contentJson ?? "",
    mdText: input.mdText ?? "",
    folderId: input.folderId ?? null,
    type: input.type ?? "rich",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
    version: 1,
  };
}
