type VFSOptions = {
  durability?: "default" | "strict" | "relaxed";
  purge?: "deferred" | "manual";
  purgeAtLeast?: number;
};

export class IDBBatchAtomicVFS {
  name: string;
  constructor(idbDatabaseName?: string, options?: VFSOptions);
  close(): Promise<void>;
  purge(path: string): Promise<void>;
}
