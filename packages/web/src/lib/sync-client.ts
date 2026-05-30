export interface NoteMetadata {
  id: string;
  title: string;
  folderId: string | null;
  type: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  version: number;
  isOwner: boolean;
  sharePermission: string | null;
}

export interface AttachmentMetadata {
  id: string;
  noteId: string;
  type: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: number;
}

export interface MetadataSyncResponse {
  notes: NoteMetadata[];
  folders: Folder[];
  tags: Tag[];
  noteTags: { noteId: string; tagId: string }[];
  attachments: AttachmentMetadata[];
}

export interface MetadataBatch {
  notes?: NoteMetadata[];
  folders?: Folder[];
  tags?: Tag[];
  noteTags?: { noteId: string; tagId: string }[];
  deletedNoteIds?: string[];
  deletedFolderIds?: string[];
  deletedTagIds?: string[];
  deletedAttachmentIds?: string[];
}

export interface CreateShareInput {
  noteId: string;
  type: "public_link" | "user_share";
  targetUsername?: string;
  permission?: "read" | "write";
  password?: string;
  expiresAt?: string;
}

export interface Share {
  id: string;
  noteId: string;
  noteTitle: string;
  type: "public_link" | "user_share";
  permission: "read" | "write";
  targetUsername: string | null;
  hasPassword: boolean;
  expiresAt: string | null;
  createdAt: string;
  shareToken?: string;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

interface Tag {
  id: string;
  name: string;
}

interface SyncClientOptions {
  serverUrl: string;
  getToken: () => string | null;
  onTokenExpired: () => Promise<boolean>;
}

export class SyncClient {
  private serverUrl: string;
  private getToken: () => string | null;
  private onTokenExpired: () => Promise<boolean>;

  constructor(opts: SyncClientOptions) {
    this.serverUrl = opts.serverUrl;
    this.getToken = opts.getToken;
    this.onTokenExpired = opts.onTokenExpired;
  }

  private async request<T>(path: string, opts?: RequestInit): Promise<T> {
    const token = this.getToken();
    if (!token) throw new Error("Not authenticated");

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opts?.headers,
    };

    let res = await fetch(`${this.serverUrl}${path}`, { ...opts, headers });

    if (res.status === 401) {
      const refreshed = await this.onTokenExpired();
      if (refreshed) {
        const newToken = this.getToken();
        headers.Authorization = `Bearer ${newToken}`;
        res = await fetch(`${this.serverUrl}${path}`, { ...opts, headers });
      } else {
        throw new Error("Token expired and refresh failed");
      }
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || `Request failed: ${res.status}`);
    }

    return res.json();
  }

  async pullMetadata(): Promise<MetadataSyncResponse> {
    return this.request<MetadataSyncResponse>("/api/v1/metadata/sync");
  }

  async pushMetadata(batch: MetadataBatch): Promise<void> {
    await this.request("/api/v1/metadata/batch", {
      method: "POST",
      body: JSON.stringify(batch),
    });
  }

  async uploadAttachment(meta: AttachmentMetadata, blob: Blob): Promise<{ id: string }> {
    const token = this.getToken();
    if (!token) throw new Error("Not authenticated");

    const formData = new FormData();
    formData.append("meta", JSON.stringify(meta));
    formData.append("file", blob, meta.filename);

    const res = await fetch(`${this.serverUrl}/api/v1/attachments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Upload failed: ${res.status} ${body}`);
    }
    return res.json();
  }

  async downloadAttachment(id: string): Promise<Blob> {
    const token = this.getToken();
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(`${this.serverUrl}/api/v1/attachments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Download failed");
    return res.blob();
  }

  async deleteAttachment(id: string): Promise<void> {
    await this.request(`/api/v1/attachments/${id}`, { method: "DELETE" });
  }

  async createShare(input: CreateShareInput): Promise<Share> {
    return this.request("/api/v1/shares", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async listShares(): Promise<Share[]> {
    return this.request("/api/v1/shares");
  }

  async deleteShare(id: string): Promise<void> {
    await this.request(`/api/v1/shares/${id}`, { method: "DELETE" });
  }
}
