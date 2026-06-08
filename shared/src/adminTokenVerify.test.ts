import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  isAdminTokenValidForRoom,
  resolveExpectedAdminTokenHash,
} from "./adminTokenVerify";

function hashSecret(value: string): string {
  return createHash("sha256").update(value.trim(), "utf8").digest("hex");
}

describe("adminTokenVerify（ISOLATE-3）", () => {
  const clientHash = hashSecret("client-super");
  const roomAHash = hashSecret("2001");
  const roomBHash = hashSecret("3001");

  it("room hash があるときは room の token のみ有効", () => {
    expect(
      isAdminTokenValidForRoom({
        token: "2001",
        clientAdminTokenHash: clientHash,
        roomAdminTokenHash: roomAHash,
        tokenHash: hashSecret,
      }),
    ).toBe(true);
    expect(
      isAdminTokenValidForRoom({
        token: "client-super",
        clientAdminTokenHash: clientHash,
        roomAdminTokenHash: roomAHash,
        tokenHash: hashSecret,
      }),
    ).toBe(false);
  });

  it("room A の token では room B の hash と一致しない", () => {
    expect(
      isAdminTokenValidForRoom({
        token: "2001",
        clientAdminTokenHash: clientHash,
        roomAdminTokenHash: roomBHash,
        tokenHash: hashSecret,
      }),
    ).toBe(false);
    expect(
      isAdminTokenValidForRoom({
        token: "3001",
        clientAdminTokenHash: clientHash,
        roomAdminTokenHash: roomBHash,
        tokenHash: hashSecret,
      }),
    ).toBe(true);
  });

  it("room hash が無いときは client hash にフォールバックする", () => {
    expect(
      isAdminTokenValidForRoom({
        token: "client-super",
        clientAdminTokenHash: clientHash,
        roomAdminTokenHash: "",
        tokenHash: hashSecret,
      }),
    ).toBe(true);
    expect(resolveExpectedAdminTokenHash({
      clientAdminTokenHash: clientHash,
      roomAdminTokenHash: "",
    })).toBe(clientHash);
  });

  it("空 token は常に invalid", () => {
    expect(
      isAdminTokenValidForRoom({
        token: "",
        clientAdminTokenHash: clientHash,
        roomAdminTokenHash: roomAHash,
        tokenHash: hashSecret,
      }),
    ).toBe(false);
  });
});
