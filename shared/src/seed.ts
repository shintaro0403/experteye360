import type { AppSettings, Scene } from "./types";

const demoSceneId = "scene-demo-1";

const demoScene: Scene = {
  id: demoSceneId,
  vistaSceneName: "検査エリア_パノラマ1",
  displayName: "検査エリア（デモ）",
  processArea: "出荷前検査",
  trainingTheme: "表示・置き場・検査状態の確認",
  attentionLabels: [
    "製品表面",
    "検査済み表示",
    "置き場",
    "記録用紙",
    "後工程への引き渡し",
  ],
  awarenessCards: [
    "ラベル・表示の違和感",
    "傷・汚れ・破損",
    "置き場の違い",
    "検査済み／未検査の混在",
    "記録・チェック漏れ",
  ],
  criteriaCards: ["品質", "安全", "工程", "記録・証跡", "後工程影響"],
  actionCards: [
    "班長へ相談する",
    "品質管理へ確認する",
    "記録に残す",
    "作業を一旦止める",
    "後工程担当へ共有する",
  ],
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
};
