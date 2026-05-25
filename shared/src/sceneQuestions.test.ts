import { describe, expect, it } from "vitest";
import { MAX_CHOICE_CARDS } from "./choices";
import { JUDGMENT_ROUND_COUNT } from "./judgmentFlow";
import {
  emptyQuestionCards,
  getSceneQuestionCards,
  normalizeScene,
  normalizeSettings,
} from "./sceneQuestions";
import { makeScene, makeSettings } from "./test/fixtures";

describe("sceneQuestions", () => {
  it("設問ごとのカードセットを roundIndex で取得する", () => {
    const scene = makeScene({
      questionCards: Array.from({ length: JUDGMENT_ROUND_COUNT }, (_, index) => ({
        awarenessCards: [`A${index + 1}`],
        criteriaCards: [`C${index + 1}`],
        actionCards: [`X${index + 1}`],
      })),
    });

    expect(getSceneQuestionCards(scene, 0)).toEqual({
      awarenessCards: ["A1"],
      criteriaCards: ["C1"],
      actionCards: ["X1"],
    });
    expect(getSceneQuestionCards(scene, 4)).toEqual({
      awarenessCards: ["A5"],
      criteriaCards: ["C5"],
      actionCards: ["X5"],
    });
  });

  it("設問範囲外の roundIndex では空カードを返す", () => {
    const scene = makeScene();

    expect(getSceneQuestionCards(scene, -1)).toEqual(emptyQuestionCards());
    expect(getSceneQuestionCards(scene, JUDGMENT_ROUND_COUNT)).toEqual(emptyQuestionCards());
  });

  it("旧形式シーンではレガシーのカードセットを返す", () => {
    const legacyScene = makeScene({
      questionCards: [],
      awarenessCards: ["A1"],
      criteriaCards: ["C1"],
      actionCards: ["X1"],
    });

    expect(getSceneQuestionCards(legacyScene, 0)).toEqual({
      awarenessCards: ["A1"],
      criteriaCards: ["C1"],
      actionCards: ["X1"],
    });
  });

  it("normalizeScene は各設問のカードを最大5件に制限する", () => {
    const longCards = ["1", "2", "3", "4", "5", "6"];
    const scene = makeScene({
      questionCards: Array.from({ length: JUDGMENT_ROUND_COUNT }, () => ({
        awarenessCards: longCards,
        criteriaCards: longCards,
        actionCards: longCards,
      })),
    });

    const normalized = normalizeScene(scene);

    for (const question of normalized.questionCards) {
      expect(question.awarenessCards).toHaveLength(MAX_CHOICE_CARDS);
      expect(question.criteriaCards).toHaveLength(MAX_CHOICE_CARDS);
      expect(question.actionCards).toHaveLength(MAX_CHOICE_CARDS);
      expect(question.awarenessCards).toEqual(["1", "2", "3", "4", "5"]);
    }
  });

  it("normalizeScene は旧形式シーンを5問分の questionCards に変換する", () => {
    const legacyScene = makeScene({
      questionCards: [],
      awarenessCards: ["A1", "A2", "A3", "A4", "A5", "A6"],
      criteriaCards: ["C1", "C2", "C3", "C4", "C5", "C6"],
      actionCards: ["X1", "X2", "X3", "X4", "X5", "X6"],
    });

    const normalized = normalizeScene(legacyScene);

    expect(normalized.questionCards).toHaveLength(JUDGMENT_ROUND_COUNT);
    expect(normalized.questionCards[0]).toEqual({
      awarenessCards: ["A1", "A2", "A3", "A4", "A5"],
      criteriaCards: ["C1", "C2", "C3", "C4", "C5"],
      actionCards: ["X1", "X2", "X3", "X4", "X5"],
    });
    expect(normalized.questionCards[0]).not.toBe(normalized.questionCards[1]);
  });

  it("normalizeSettings は全シーンを正規化する", () => {
    const settings = makeSettings({
      scenes: [
        makeScene({
          id: "scene-a",
          questionCards: [],
          awarenessCards: ["A"],
          criteriaCards: ["C"],
          actionCards: ["X"],
        }),
        makeScene({
          id: "scene-b",
          questionCards: Array.from({ length: JUDGMENT_ROUND_COUNT }, () => ({
            awarenessCards: ["1", "2", "3", "4", "5", "6"],
            criteriaCards: ["C"],
            actionCards: ["X"],
          })),
        }),
      ],
    });

    const normalized = normalizeSettings(settings);

    expect(normalized.scenes).toHaveLength(2);
    expect(normalized.scenes[0].questionCards).toHaveLength(JUDGMENT_ROUND_COUNT);
    expect(normalized.scenes[1].questionCards[0].awarenessCards).toEqual(["1", "2", "3", "4", "5"]);
  });
});
