import { limitChoices } from "./choices";
import { JUDGMENT_ROUND_COUNT } from "./judgmentFlow";
import type { Scene, SceneQuestionCards } from "./types";

export function emptyQuestionCards(): SceneQuestionCards {
  return {
    awarenessCards: [],
    criteriaCards: [],
    actionCards: [],
  };
}

/** 設問 index（0〜4）のカードセット。旧形式は全設問で同一カードを返す */
export function getSceneQuestionCards(scene: Scene, roundIndex: number): SceneQuestionCards {
  if (scene.questionCards?.length === JUDGMENT_ROUND_COUNT) {
    return scene.questionCards[roundIndex] ?? emptyQuestionCards();
  }
  return {
    awarenessCards: scene.awarenessCards ?? [],
    criteriaCards: scene.criteriaCards ?? [],
    actionCards: scene.actionCards ?? [],
  };
}

export function normalizeScene(scene: Scene): Scene {
  if (scene.questionCards?.length === JUDGMENT_ROUND_COUNT) {
    return {
      ...scene,
      questionCards: scene.questionCards.map((q) => ({
        awarenessCards: limitChoices(q.awarenessCards ?? []),
        criteriaCards: limitChoices(q.criteriaCards ?? []),
        actionCards: limitChoices(q.actionCards ?? []),
      })),
    };
  }
  const legacy: SceneQuestionCards = {
    awarenessCards: limitChoices(scene.awarenessCards ?? []),
    criteriaCards: limitChoices(scene.criteriaCards ?? []),
    actionCards: limitChoices(scene.actionCards ?? []),
  };
  const questionCards = Array.from({ length: JUDGMENT_ROUND_COUNT }, () => ({
    awarenessCards: [...legacy.awarenessCards],
    criteriaCards: [...legacy.criteriaCards],
    actionCards: [...legacy.actionCards],
  }));
  return { ...scene, questionCards };
}

export function normalizeSettings<T extends { scenes: Scene[] }>(settings: T): T {
  return {
    ...settings,
    scenes: settings.scenes.map(normalizeScene),
  };
}
