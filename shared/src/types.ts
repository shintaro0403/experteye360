/** 3DVista シーンに紐づく研修設定（ExpertEye360 が保持） */
export type Scene = {
  id: string;
  /** 3DVista のシーン名または識別名 */
  vistaSceneName: string;
  /** 管理画面・受講者向け表示名 */
  displayName: string;
  processArea: string;
  trainingTheme: string;
  attentionLabels: string[];
  awarenessCards: string[];
  criteriaCards: string[];
  actionCards: string[];
  veteranTemplate: VeteranTemplate;
};

export type VeteranTemplate = {
  /** ベテランが見ている注目ポイント */
  focusPoints: string[];
  /** 重視する判断基準（優先が先頭） */
  criteriaPriority: string[];
  recommendedActions: string[];
  shareRoutes: string[];
  commonMisses: string[];
  instructorComment: string;
  ojtChecklist: string[];
};

export type ParticipantSubmission = {
  id: string;
  createdAt: string;
  participantName: string;
  /** 所属（受講者入力） */
  affiliation?: string;
  sceneId: string;
  attentionSelected: string[];
  /** 一問目（注目）選択後の一言メモ */
  attentionNote: string;
  awarenessSelections: string[];
  awarenessNote: string;
  criteriaOrdered: string[];
  criteriaNote: string;
  actionsSelected: string[];
  actionsNote: string;
  /** 1〜5（1=かなり不安 … 5=強く自信あり） */
  confidenceLevel: number;
};

export type AppSettings = {
  /** 登録した 3DVista ツアー URL */
  tourUrl: string;
  scenes: Scene[];
};
