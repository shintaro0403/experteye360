/** 1 設問分のカード選択肢（各タイプ最大 5 枚） */
export type SceneQuestionCards = {
  awarenessCards: string[];
  criteriaCards: string[];
  actionCards: string[];
};

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
  /** 設問 1〜5 それぞれのカード（受講者の 5 問フローに対応） */
  questionCards: SceneQuestionCards[];
  /** @deprecated 読み取り互換。新規は questionCards を使用 */
  awarenessCards?: string[];
  criteriaCards?: string[];
  actionCards?: string[];
  /** @deprecated settings JSON 互換用。常に空オブジェクト。 */
  veteranTemplate: VeteranTemplate;
};

/** @deprecated settings JSON 互換用。アプリでは未使用。 */
export type VeteranTemplate = {
  focusPoints: string[];
  /** 重視する判断基準（優先が先頭） */
  criteriaPriority: string[];
  recommendedActions: string[];
  shareRoutes: string[];
  commonMisses: string[];
  instructorComment: string;
  ojtChecklist: string[];
};

/** 1 設問（気づき→共有→判断基準→一言メモ）分の回答 */
export type JudgmentRound = {
  awarenessSelection: string[];
  actionSelection: string[];
  criteriaOrdered: string[];
  roundNote: string;
};

/** 研修回（受講者の研修コードで入室。管理者が設定） */
export type TrainingRoom = {
  roomId: string;
  displayName: string;
  /** 受講者が入力する平文コード（本番は API 側でハッシュ照合） */
  accessCode: string;
  enabled: boolean;
};

export type ParticipantSubmission = {
  id: string;
  createdAt: string;
  participantName: string;
  /** 所属（受講者入力） */
  affiliation?: string;
  /** 研修コード検証後に確定した roomId */
  roomId?: string;
  sceneId: string;
  /** 5 設問分（各 4 画面サイクル） */
  rounds: JudgmentRound[];
  /** 1〜5（ラベルは shared/confidence.ts の CONFIDENCE_LABELS） */
  confidenceLevel: number;
  /** 旧形式（互換のため submit 時にも冗長保存） */
  attentionSelected?: string[];
  attentionNote?: string;
  awarenessSelections?: string[];
  awarenessNote?: string;
  criteriaOrdered?: string[];
  criteriaNote?: string;
  actionsSelected?: string[];
  actionsNote?: string;
};

export type AppSettings = {
  /** 登録した 3DVista ツアー URL */
  tourUrl: string;
  scenes: Scene[];
  /** 受講者向け研修回（研修コード） */
  rooms: TrainingRoom[];
  /** 管理者入室用コード（開発時は settings に平文保持） */
  adminAccessCode: string;
};
