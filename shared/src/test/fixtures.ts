import type { AppSettings, ParticipantSubmission, Scene } from "../types";

export function makeScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: "scene-1",
    vistaSceneName: "受入エリア",
    displayName: "受入エリア",
    processArea: "受入",
    trainingTheme: "テーマ",
    attentionLabels: [],
    questionCards: Array.from({ length: 5 }, () => ({
      awarenessCards: ["A1"],
      criteriaCards: ["C1"],
      actionCards: ["X1"],
    })),
    veteranTemplate: {
      focusPoints: [],
      criteriaPriority: [],
      recommendedActions: [],
      shareRoutes: [],
      commonMisses: [],
      instructorComment: "",
      ojtChecklist: [],
    },
    ...overrides,
  };
}

export function makeSubmission(overrides: Partial<ParticipantSubmission> = {}): ParticipantSubmission {
  return {
    id: "sub-1",
    createdAt: "2026-05-21T00:00:00.000Z",
    participantName: "山田",
    affiliation: "営業部",
    sceneId: "scene-1",
    rounds: Array.from({ length: 5 }, () => ({
      awarenessSelection: [],
      actionSelection: [],
      criteriaOrdered: [],
      roundNote: "",
    })),
    confidenceLevel: 3,
    ...overrides,
  };
}

export function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    tourUrl: "https://example.com/tour",
    scenes: [makeScene()],
    rooms: [
      {
        roomId: "room-demo-1",
        displayName: "デモ研修",
        accessCode: "DEMO-2026",
        enabled: true,
      },
    ],
    adminAccessCode: "admin-demo",
    ...overrides,
  };
}
