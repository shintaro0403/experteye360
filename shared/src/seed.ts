import { DEFAULT_ADMIN_ACCESS_CODE, DEFAULT_TRAINING_ROOMS } from "./appSettings";
import { JUDGMENT_ROUND_COUNT } from "./judgmentFlow";
import type { AppSettings, Scene, SceneQuestionCards } from "./types";

const demoSceneId = "scene-demo-1";

const defaultCriteria = ["品質", "安全", "工程", "記録・証跡", "後工程影響"];
const defaultActions = [
  "班長へ相談する",
  "品質管理へ確認する",
  "記録に残す",
  "作業を一旦止める",
  "後工程担当へ共有する",
];

const awarenessByQuestion: string[][] = [
  [
    "ラベル・表示の違和感",
    "傷・汚れ・破損",
    "置き場の違い",
    "検査済み／未検査の混在",
    "記録・チェック漏れ",
  ],
  [
    "異音・振動の違和感",
    "工具の置き忘れ",
    "作業手順との違い",
    "安全保護具の着用",
    "通路・動線の乱れ",
  ],
  [
    "後工程に影響しそうな状態",
    "いつもと違う状態",
    "数量・在庫の違い",
    "期限・ロット表示",
    "設備の停止表示",
  ],
  [
    "記録用紙の不備",
    "検査済み表示の位置",
    "台車・搬送の状態",
    "照明・視認性",
    "清掃・5Sの乱れ",
  ],
  [
    "引き渡し状態の違い",
    "梱包・保護の状態",
    "識別タグの欠落",
    "混載の可能性",
    "出荷可否の判断",
  ],
];

function buildQuestionCards(): SceneQuestionCards[] {
  return Array.from({ length: JUDGMENT_ROUND_COUNT }, (_, i) => ({
    awarenessCards: awarenessByQuestion[i] ?? awarenessByQuestion[0],
    criteriaCards: [...defaultCriteria],
    actionCards: [...defaultActions],
  }));
}

const demoScene: Scene = {
  id: demoSceneId,
  vistaSceneName: "検査エリア_パノラマ1",
  displayName: "検査エリア（デモ）",
  processArea: "出荷前検査",
  trainingTheme: "表示・置き場・検査状態の確認",
  attentionLabels: [],
  questionCards: buildQuestionCards(),
  awarenessCards: awarenessByQuestion[0],
  criteriaCards: defaultCriteria,
  actionCards: defaultActions,
  veteranTemplate: {
    focusPoints: ["検査済み表示", "記録用紙", "後工程への引き渡し状態"],
    criteriaPriority: ["品質", "記録・証跡", "後工程影響", "安全"],
    recommendedActions: ["記録に残す", "班長へ相談する"],
    shareRoutes: ["品質管理へ確認する"],
    commonMisses: ["検査済みラベルと実物の対応確認を忘れがち"],
    instructorComment: "ラベル位置の違和感は、必ず対象製品と照合させる。",
    ojtChecklist: [
      "顧客影響の観点を確認する",
      "記録・証跡を残す意識を確認する",
    ],
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  tourUrl: "https://example.com/3dvista-tour-placeholder",
  scenes: [demoScene],
  rooms: DEFAULT_TRAINING_ROOMS.map((r) => ({ ...r })),
  adminAccessCode: DEFAULT_ADMIN_ACCESS_CODE,
};
