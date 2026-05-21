declare module "wa-sqlite/src/examples/IDBMinimalVFS.js" {
  export class IDBMinimalVFS {
    constructor(name: string, options?: Record<string, unknown>);
    name: string;
  }
}

declare module "uuid" {
  export function v4(): string;
}
