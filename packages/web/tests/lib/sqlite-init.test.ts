import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { isAvailableMock } = vi.hoisted(() => ({
  isAvailableMock: vi.fn(),
}));

vi.mock("../../src/lib/sqlite-shared-worker", () => {
  function ClientMock(this: any) {
    this.init = vi.fn().mockResolvedValue(undefined);
    this.query = vi.fn().mockResolvedValue([]);
    this.run = vi.fn().mockResolvedValue(undefined);
    this.close = vi.fn().mockResolvedValue(undefined);
    this.onDataChange = vi.fn().mockReturnValue(() => {});
  }
  ClientMock.isAvailable = isAvailableMock;

  function AdapterMock(this: any) {
    this.init = vi.fn().mockResolvedValue(undefined);
    this.close = vi.fn().mockResolvedValue(undefined);
  }

  return {
    SharedWorkerSQLiteClient: ClientMock,
    SharedWorkerStorageAdapter: AdapterMock,
  };
});

vi.mock("@notes/core", () => {
  function WebMock(this: any) {
    this.init = vi.fn().mockResolvedValue(undefined);
    this.close = vi.fn().mockResolvedValue(undefined);
  }
  return {
    WebStorageAdapter: WebMock,
  };
});

describe("sqlite-init fallback", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should use SharedWorker connection when SharedWorker is available", async () => {
    isAvailableMock.mockReturnValue(true);

    const { initStorage, getConnectionMode } = await import(
      "../../src/lib/sqlite-init"
    );
    await initStorage();
    expect(getConnectionMode()).toBe("shared-worker");
  });

  it("should fall back to direct connection when SharedWorker unavailable", async () => {
    isAvailableMock.mockReturnValue(false);

    const { initStorage, getConnectionMode } = await import(
      "../../src/lib/sqlite-init"
    );
    await initStorage();
    expect(getConnectionMode()).toBe("direct");
  });
});