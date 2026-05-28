import { describe, it, expect } from "vitest";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "./token";

const SECRET = "test-access-secret";
const REFRESH_SECRET = "test-refresh-secret";

describe("token", () => {
  it("should sign and verify access token", () => {
    const token = signAccessToken({ userId: "user-1", username: "alice" }, SECRET);
    const payload = verifyAccessToken(token, SECRET);

    expect(payload.userId).toBe("user-1");
    expect(payload.username).toBe("alice");
  });

  it("should sign and verify refresh token", () => {
    const token = signRefreshToken({ userId: "user-1" }, REFRESH_SECRET);
    const payload = verifyRefreshToken(token, REFRESH_SECRET);

    expect(payload.userId).toBe("user-1");
  });

  it("should reject token with wrong secret", () => {
    const token = signAccessToken({ userId: "user-1", username: "alice" }, SECRET);
    expect(() => verifyAccessToken(token, "wrong-secret")).toThrow();
  });

  it("should reject expired token", () => {
    const token = signAccessToken({ userId: "user-1", username: "alice" }, SECRET, "-1h");
    expect(() => verifyAccessToken(token, SECRET)).toThrow();
  });

  it("should not verify access token with refresh secret", () => {
    const token = signAccessToken({ userId: "user-1", username: "alice" }, SECRET);
    expect(() => verifyRefreshToken(token, REFRESH_SECRET)).toThrow();
  });
});
