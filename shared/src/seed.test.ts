import { describe, expect, it } from "vitest";
import { MAX_CHOICE_CARDS } from "./choices";
import { JUDGMENT_ROUND_COUNT } from "./judgmentFlow";
import { DEFAULT_SETTINGS } from "./seed";

describe("DEFAULT_SETTINGS", () => {
  it("デモシーンを1件以上持つ", () => {
    expect(DEFAULT_SETTINGS.scenes.length).toBeGreaterThanOrEqual(1);
  });

  it("各シーンは5問分の questionCards を持つ", () => {
    for (const scene of DEFAULT_SETTINGS.scenes) {
      expect(scene.questionCards).toHaveLength(JUDGMENT_ROUND_COUNT);
    }
  });

  it("各設問のカード配列は最大5件である", () => {
    for (const scene of DEFAULT_SETTINGS.scenes) {
      for (const question of scene.questionCards) {
        expect(question.awarenessCards.length).toBeLessThanOrEqual(MAX_CHOICE_CARDS);
        expect(question.criteriaCards.length).toBeLessThanOrEqual(MAX_CHOICE_CARDS);
        expect(question.actionCards.length).toBeLessThanOrEqual(MAX_CHOICE_CARDS);
      }
    }
  });

  it("必須フィールドとして tourUrl・rooms・adminAccessCode を持つ", () => {
    expect(DEFAULT_SETTINGS.tourUrl).toBeTruthy();
    expect(DEFAULT_SETTINGS.rooms.length).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_SETTINGS.rooms[0]).toMatchObject({
      roomId: expect.any(String),
      displayName: expect.any(String),
      accessCode: expect.any(String),
      enabled: true,
    });
    expect(DEFAULT_SETTINGS.adminAccessCode).toBeTruthy();
  });
});
