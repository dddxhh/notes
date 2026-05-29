export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
  sortOrder?: number;
  id?: string;
}

export interface UpdateFolderInput {
  name?: string;
  parentId?: string | null;
  sortOrder?: number;
}

export function createDefaultFolder(input: CreateFolderInput): Folder {
  return {
    id: "",
    name: input.name,
    parentId: input.parentId ?? null,
    sortOrder: input.sortOrder ?? 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
