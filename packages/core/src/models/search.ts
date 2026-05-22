import { NoteType } from "./note";
import { AttachmentType } from "./attachment";

export type TagFilterMode = "intersection" | "union";

export interface SearchInput {
  query?: string;
  folderId?: string;
  tagIds?: string[];
  tagMode?: TagFilterMode;
  type?: NoteType;
  hasAttachment?: AttachmentType;
  dateRange?: {
    field: "created_at" | "updated_at";
    from?: number;
    to?: number;
  };
  includeDeleted?: boolean;
  sortBy?: "updated_at" | "created_at" | "title";
  sortOrder?: "desc" | "asc";
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  notes: { id: string; title: string; updatedAt: number }[];
  total: number;
  hasMore: boolean;
}
