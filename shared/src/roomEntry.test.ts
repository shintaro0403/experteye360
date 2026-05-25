import { describe, expect, it } from "vitest";
import {
  canShowProfileFields,
  TRAINING_CODE_MISMATCH_MESSAGE,
  verifyTrainingCode,
} from "./roomEntry";
import type { TrainingRoom } from "./types";

const rooms: TrainingRoom[] = [
  { roomId: "room-a", displayName: "A", accessCode: "DEMO-2026", enabled: true },
  { roomId: "room-b", displayName: "B", accessCode: "OTHER", enabled: false },
];

describe("verifyTrainingCode", () => {
  it("検証前はプロフィール欄を出してはいけない", () => {
    expect(canShowProfileFields(null)).toBe(false);
    expect(canShowProfileFields("")).toBe(false);
  });

  it("正しい研修コードのとき roomId が返る", () => {
    const result = verifyTrainingCode("demo-2026", rooms);
    expect(result).toEqual({ ok: true, roomId: "room-a" });
    expect(canShowProfileFields("room-a")).toBe(true);
  });

  it("不一致のとき固定文言だけを返す", () => {
    const result = verifyTrainingCode("wrong", rooms);
    expect(result).toEqual({ ok: false, message: TRAINING_CODE_MISMATCH_MESSAGE });
  });

  it("enabled=false の room は一致しても拒否する", () => {
    const result = verifyTrainingCode("OTHER", rooms);
    expect(result.ok).toBe(false);
  });
});
