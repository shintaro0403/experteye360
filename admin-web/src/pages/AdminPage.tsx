import React, { useEffect, useMemo, useState } from "react";
import {
  getAdminSessionToken,
  getAdminSessionRoomId,
  isAdminTrainingGateActive,
  isAdminWorkspaceActive,
  setAdminSessionActive,
  setAdminSessionRoomId,
  setAdminSessionToken,
  setAdminTrainingGateActive,
} from "@shared/adminEntry";
import {
  resolveAdminRoomByCode,
  resolveAdminRoomForSheetLogin,
  resolveAdminScopeRoom,
} from "@shared/adminRoom";
import {
  canProceedToSharedAdminApiVerify,
  isTrainingCodeScopedAdmin,
  resolveAdminRoomByTrainingCode,
  verifySharedAdminAccessCode,
} from "@shared/adminScopedLogin";
import { getConfidenceLabel } from "@shared/confidence";
import { getSubmissionRounds, JUDGMENT_ROUND_COUNT } from "@shared/judgmentFlow";
import { generateParticipantPdf } from "@shared/pdfExport";
import {
  isSheetStorageBackend,
  sheetApiErrorDetail,
  changeTrainingCodeAsync,
  verifyAdminTokenAsync,
  verifyTrainingCodeAsync,
} from "@shared/storage";
import { TRAINING_CODE_MISMATCH_MESSAGE } from "@shared/roomEntry";
import type { ParticipantSubmission, Scene } from "@shared/types";
import { ActionButton } from "../components/ActionButton";
import { CardSlotsField, cardsToSlots, slotsToCards } from "../components/CardSlotsField";
import { ImeInput } from "../components/ImeField";
import {
  LOCAL_DEMO_ADMIN_CODE,
  LOCAL_DEMO_TRAINING_CODE,
  SHEET_DEMO_ADMIN_TOKEN,
  SHEET_DEMO_TRAINING_CODE,
} from "@shared/demoCredentials";
import { useAppData } from "../hooks/useAppData";
import { usePendingAction } from "../hooks/usePendingAction";

const ADMIN_ACTION = {
  login: "login",
  enterTrainingCode: "enterTrainingCode",
  reload: "reload",
  addScene: "addScene",
  promoteScene: "promoteScene",
  removeScene: "removeScene",
  saveScene: "saveScene",
  saveTrainingCode: "saveTrainingCode",
  clearResponses: "clearResponses",
  downloadPdf: "downloadPdf",
} as const;

type QuestionEditorDraft = {
  awarenessCardSlots: string[];
  criteriaCardSlots: string[];
  actionCardSlots: string[];
};

type SceneEditorDraft = {
  vistaSceneName: string;
  displayName: string;
  processArea: string;
  trainingTheme: string;
  questions: QuestionEditorDraft[];
};

function questionToDraft(q: {
  awarenessCards: string[];
  criteriaCards: string[];
  actionCards: string[];
}): QuestionEditorDraft {
  return {
    awarenessCardSlots: cardsToSlots(q.awarenessCards),
    criteriaCardSlots: cardsToSlots(q.criteriaCards),
    actionCardSlots: cardsToSlots(q.actionCards),
  };
}

function sceneToEditorDraft(scene: Scene): SceneEditorDraft {
  const questions =
    scene.questionCards?.length === JUDGMENT_ROUND_COUNT
      ? scene.questionCards.map(questionToDraft)
      : Array.from({ length: JUDGMENT_ROUND_COUNT }, () =>
          questionToDraft({
            awarenessCards: scene.awarenessCards ?? [],
            criteriaCards: scene.criteriaCards ?? [],
            actionCards: scene.actionCards ?? [],
          }),
        );

  return {
    vistaSceneName: scene.vistaSceneName,
    displayName: scene.displayName,
    processArea: scene.processArea,
    trainingTheme: scene.trainingTheme,
    questions,
  };
}

function editorDraftToScene(base: Scene, draft: SceneEditorDraft): Scene {
  const questionCards = draft.questions.map((q) => ({
    awarenessCards: slotsToCards(q.awarenessCardSlots),
    criteriaCards: slotsToCards(q.criteriaCardSlots),
    actionCards: slotsToCards(q.actionCardSlots),
  }));

  return {
    ...base,
    vistaSceneName: draft.vistaSceneName,
    displayName: draft.displayName,
    processArea: draft.processArea,
    trainingTheme: draft.trainingTheme,
    attentionLabels: [],
    questionCards,
    awarenessCards: questionCards[0]?.awarenessCards ?? [],
    criteriaCards: questionCards[0]?.criteriaCards ?? [],
    actionCards: questionCards[0]?.actionCards ?? [],
  };
}

function uid() {
  return crypto.randomUUID();
}

function safeFilePart(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]+/g, "_") || "unknown";
}

const EMPTY_VETERAN_TEMPLATE = {
  focusPoints: [],
  criteriaPriority: [],
  recommendedActions: [],
  shareRoutes: [],
  commonMisses: [],
  instructorComment: "",
  ojtChecklist: [],
};

const PARTICIPANT_SCENE_INDEX = 0;

function defaultQuestionDraft(n: number): QuestionEditorDraft {
  return {
    awarenessCardSlots: cardsToSlots([`気づきカード${n}`]),
    criteriaCardSlots: cardsToSlots(["品質", "安全"]),
    actionCardSlots: cardsToSlots(["班長へ相談する"]),
  };
}

function AdminLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="a-label">
      {label}
      {children}
    </label>
  );
}

function ResponseDetail({
  response,
  sceneLabel,
}: {
  response: ParticipantSubmission;
  sceneLabel: string;
}) {
  const rounds = getSubmissionRounds(response);
  return (
    <div className="a-response-detail">
      <dl className="a-dl">
        <dt>名前</dt>
        <dd>{response.participantName}</dd>
        <dt>所属</dt>
        <dd>{response.affiliation?.trim() || "—"}</dd>
        <dt>シーン</dt>
        <dd>{sceneLabel}</dd>
        <dt>確信度</dt>
        <dd>{getConfidenceLabel(response.confidenceLevel)}</dd>
        <dt>送信日時</dt>
        <dd>{new Date(response.createdAt).toLocaleString("ja-JP")}</dd>
      </dl>
      <h3>設問ごとの回答</h3>
      <ol className="a-rounds">
        {rounds.map((r, i) => (
          <li key={i}>
            <strong>設問 {i + 1}</strong>
            <ul>
              <li>気づき: {r.awarenessSelection.join("、") || "—"}</li>
              <li>共有・行動: {r.actionSelection.join("、") || "—"}</li>
              <li>判断基準: {r.criteriaOrdered.join("、") || "—"}</li>
              <li>一言メモ: {r.roundNote.trim() || "—"}</li>
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

function formatClearResponsesError(err: unknown): string {
  const detail = sheetApiErrorDetail(err);
  if (detail.includes("Unknown route") && detail.includes("responses/clear")) {
    return [
      "全回答の削除に失敗しました。",
      "",
      "実 GAS に全回答削除 API（responses/clear）がありません。",
      "gas/Code.gs を Apps Script に反映し、「新しいデプロイ」したあと .env の VITE_SHEET_API_BASE を新しい URL に更新してください。",
    ].join("\n");
  }
  if (detail.includes("Invalid admin token")) {
    return "全回答の削除に失敗しました。管理者コードが無効です。一度ログアウトして、正しい管理者コードで再入室してください。";
  }
  if (detail.includes("Invalid room")) {
    return "全回答の削除に失敗しました。研修回 ID がシートと一致しません（例: demo-room-001）。設定の再読込後にもう一度お試しください。";
  }
  if (detail) {
    return `全回答の削除に失敗しました。\n\n（${detail}）`;
  }
  return "全回答の削除に失敗しました。管理者コードを確認して再度お試しください。";
}

export function AdminPage() {
  const [adminToken, setAdminTokenState] = useState(() => getAdminSessionToken() ?? "");
  const [adminGateActive, setAdminGateActiveState] = useState(
    () => isAdminTrainingGateActive() && !isAdminWorkspaceActive(),
  );
  const [adminWorkspaceActive, setAdminWorkspaceActiveState] = useState(() => isAdminWorkspaceActive());
  const {
    settings,
    setSettings,
    responses,
    replaceResponses,
    refresh,
    loading,
    refreshing,
    error,
  } = useAppData({
    adminToken: adminWorkspaceActive ? adminToken : null,
    adminRoomId: adminWorkspaceActive ? getAdminSessionRoomId() : null,
  });
  const [adminCodeInput, setAdminCodeInput] = useState("");
  const [trainingCodeLoginInput, setTrainingCodeLoginInput] = useState("");
  const [nextAccessCodeInput, setNextAccessCodeInput] = useState("");
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const trainingCodeScopedAdmin = isTrainingCodeScopedAdmin(settings);
  const [tab, setTab] = useState<"base" | "scenes" | "responses">("base");
  const [activeSceneId, setActiveSceneId] = useState(settings.scenes[0]?.id ?? "");
  const [draft, setDraft] = useState<SceneEditorDraft | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState(0);
  const { runPending, isPending } = usePendingAction();

  const activeScene = useMemo(
    () => settings.scenes.find((s) => s.id === activeSceneId),
    [activeSceneId, settings.scenes],
  );

  const participantScene = settings.scenes[PARTICIPANT_SCENE_INDEX] ?? null;
  const activeSceneIndex = settings.scenes.findIndex((s) => s.id === activeSceneId);

  const returnToAdminCodeEntry = () => {
    setAdminSessionActive(false);
    setAdminTrainingGateActive(false);
    setAdminTokenState("");
    setAdminGateActiveState(false);
    setAdminWorkspaceActiveState(false);
    setAdminLoginError(null);
    setTrainingCodeLoginInput("");
  };

  const completeWorkspaceLogin = (token: string, roomId: string) => {
    setAdminSessionActive(true);
    setAdminSessionToken(token);
    setAdminSessionRoomId(roomId);
    setAdminTokenState(token);
    setAdminTrainingGateActive(false);
    setAdminGateActiveState(false);
    setAdminWorkspaceActiveState(true);
    setAdminLoginError(null);
    setTrainingCodeLoginInput("");
    setTab("base");
  };

  const tryAdminLogin = () =>
    void runPending(ADMIN_ACTION.login, async () => {
      if (trainingCodeScopedAdmin) {
        const token = adminCodeInput.trim();
        const sharedAdminOk = isSheetStorageBackend()
          ? canProceedToSharedAdminApiVerify(token, settings)
          : verifySharedAdminAccessCode(token, settings);
        if (!sharedAdminOk) {
          setAdminLoginError("管理者コードが正しくありません");
          return;
        }
        setAdminSessionToken(token);
        setAdminTokenState(token);
        setAdminTrainingGateActive(true);
        setAdminGateActiveState(true);
        setAdminLoginError(null);
        setAdminCodeInput("");
        return;
      }

      if (isSheetStorageBackend()) {
        const token = adminCodeInput.trim();
        if (!token) {
          setAdminLoginError("管理者コードが正しくありません");
          return;
        }
        const room = resolveAdminRoomForSheetLogin(settings, token);
        if (!room) {
          setAdminLoginError("管理者コードが正しくありません");
          return;
        }
        try {
          await verifyAdminTokenAsync(token, room.roomId);
          completeWorkspaceLogin(token, room.roomId);
          setAdminCodeInput("");
        } catch {
          setAdminLoginError("管理者コードが正しくありません");
        }
        return;
      }

      const room = resolveAdminRoomByCode(settings, adminCodeInput);
      if (room) {
        setAdminSessionActive(true);
        setAdminSessionRoomId(room.roomId);
        setAdminWorkspaceActiveState(true);
        setAdminLoginError(null);
        setAdminCodeInput("");
        setTab("base");
        return;
      }
      setAdminLoginError("管理者コードが正しくありません");
    });

  const tryTrainingCodeEnter = () =>
    void runPending(ADMIN_ACTION.enterTrainingCode, async () => {
      const token = (adminToken || getAdminSessionToken() || "").trim();
      const trainingCode = trainingCodeLoginInput.trim();
      if (!token) {
        setAdminLoginError("管理者コード入力からやり直してください");
        return;
      }
      let roomId: string;
      if (isSheetStorageBackend()) {
        const verified = await verifyTrainingCodeAsync(trainingCode, settings.rooms);
        if (!verified.ok) {
          setAdminLoginError(verified.message);
          return;
        }
        roomId = verified.roomId;
        try {
          await verifyAdminTokenAsync(token, roomId);
          completeWorkspaceLogin(token, roomId);
        } catch {
          setAdminLoginError("管理者コードが正しくありません");
        }
        return;
      }
      const room = resolveAdminRoomByTrainingCode(settings, trainingCode);
      if (!room) {
        setAdminLoginError(TRAINING_CODE_MISMATCH_MESSAGE);
        return;
      }
      completeWorkspaceLogin(token, room.roomId);
    });

  useEffect(() => {
    if (!activeScene) {
      setDraft(null);
      return;
    }
    setDraft(sceneToEditorDraft(activeScene));
    setExpandedQuestion(0);
  }, [activeSceneId]);

  const patchDraft = (patch: Partial<SceneEditorDraft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };

  const patchQuestion = (index: number, patch: Partial<QuestionEditorDraft>) => {
    setDraft((d) => {
      if (!d) return d;
      const questions = d.questions.map((q, i) => (i === index ? { ...q, ...patch } : q));
      return { ...d, questions };
    });
  };

  const saveSceneDraft = () =>
    void runPending(ADMIN_ACTION.saveScene, async () => {
      if (!activeScene || !draft) return;
      const merged = editorDraftToScene(activeScene, draft);
      const nextScenes = settings.scenes.map((s) => (s.id === merged.id ? merged : s));
      await setSettings({ ...settings, scenes: nextScenes });
    });

  const saveTrainingCode = () =>
    void runPending(ADMIN_ACTION.saveTrainingCode, async () => {
      const nextAccessCode = nextAccessCodeInput.trim();
      if (!nextAccessCode) {
        alert("研修コードを入力してください");
        return;
      }
      const roomId = resolveAdminScopeRoom(settings).roomId;
      if (!adminToken.trim() || !roomId) {
        alert("研修コードの保存に失敗しました（管理者または研修回が無効です）。");
        return;
      }

      try {
        if (isSheetStorageBackend()) {
          await changeTrainingCodeAsync({
            adminToken,
            roomId,
            nextAccessCode,
          });
        } else {
          // localStorage backend: 該当 room の accessCode を更新
          const nextRooms = settings.rooms.map((r) =>
            r.roomId === roomId ? { ...r, accessCode: nextAccessCode } : r,
          );
          await setSettings({ ...settings, rooms: nextRooms });
        }

        setNextAccessCodeInput("");
        await refresh();
        alert("研修コードを保存しました。受講者に新しいコードを案内してください。");
      } catch (err) {
        alert(err instanceof Error ? err.message : "研修コードの保存に失敗しました。");
      }
    });

  const addScene = () =>
    void runPending(ADMIN_ACTION.addScene, async () => {
      const questionCards = Array.from({ length: JUDGMENT_ROUND_COUNT }, (_, i) => {
        const q = defaultQuestionDraft(i + 1);
        return {
          awarenessCards: slotsToCards(q.awarenessCardSlots),
          criteriaCards: slotsToCards(q.criteriaCardSlots),
          actionCards: slotsToCards(q.actionCardSlots),
        };
      });
      const s: Scene = {
        id: uid(),
        vistaSceneName: "新規シーン（3DVista名を入力）",
        displayName: "新規シーン",
        processArea: "",
        trainingTheme: "",
        attentionLabels: [],
        questionCards,
        awarenessCards: questionCards[0].awarenessCards,
        criteriaCards: questionCards[0].criteriaCards,
        actionCards: questionCards[0].actionCards,
        veteranTemplate: { ...EMPTY_VETERAN_TEMPLATE },
      };
      await setSettings({ ...settings, scenes: [...settings.scenes, s] });
      setActiveSceneId(s.id);
    });

  const removeScene = (id: string) => {
    if (!confirm("このシーンを削除しますか？")) return;
    void runPending(ADMIN_ACTION.removeScene, async () => {
      const next = settings.scenes.filter((s) => s.id !== id);
      await setSettings({ ...settings, scenes: next });
      setActiveSceneId(next[0]?.id ?? "");
    });
  };

  const promoteSceneToParticipant = (id: string) =>
    void runPending(ADMIN_ACTION.promoteScene, async () => {
      const idx = settings.scenes.findIndex((s) => s.id === id);
      if (idx <= PARTICIPANT_SCENE_INDEX) return;
      const next = [...settings.scenes];
      const [scene] = next.splice(idx, 1);
      next.unshift(scene);
      await setSettings({ ...settings, scenes: next });
      setActiveSceneId(id);
    });

  const clearAllResponses = () => {
    if (!confirm("全回答を削除しますか？")) return;
    void runPending(ADMIN_ACTION.clearResponses, async () => {
      try {
        await replaceResponses([]);
        setSelectedResponseId(null);
      } catch (err) {
        alert(formatClearResponsesError(err));
      }
    });
  };

  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const selectedResponse = responses.find((r) => r.id === selectedResponseId) ?? null;
  const selectedResponseScene =
    selectedResponse && settings.scenes.find((s) => s.id === selectedResponse.sceneId);

  const downloadSelectedResponsePdf = () =>
    void runPending(ADMIN_ACTION.downloadPdf, async () => {
      if (!selectedResponse || !selectedResponseScene) return;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      const pdf = generateParticipantPdf({
        submission: selectedResponse,
        scene: selectedResponseScene,
      });
      const blob = new Blob([pdf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `experteye360-${safeFilePart(selectedResponse.participantName)}-${safeFilePart(selectedResponse.id)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });

  if (!adminGateActive && !adminWorkspaceActive) {
    return (
      <div className="a-shell">
        <div className="a-page a-entry-gate">
          <div className="a-entry-card">
            <h1>管理者コード</h1>
            <p>
              {trainingCodeScopedAdmin
                ? "共有の管理者コードを入力してください。次の画面で操作する研修回の研修コードを入力します。"
                : "管理者コードを入力してください。研修コードとは別のコードです。受講者向けの研修コードはログイン後に設定できます。"}
            </p>
            {adminLoginError && (
              <p className="a-entry-error" role="alert">
                {adminLoginError}
              </p>
            )}
            <AdminLabel label="管理者コード">
              <ImeInput
                className="a-input"
                value={adminCodeInput}
                onChange={setAdminCodeInput}
                placeholder="管理者コード"
                onKeyDown={(e) => {
                  if (e.key === "Enter") tryAdminLogin();
                }}
              />
            </AdminLabel>
            <div className="a-actions">
              <ActionButton
                className="a-btn a-btn--primary"
                busy={isPending(ADMIN_ACTION.login)}
                onClick={tryAdminLogin}
              >
                {trainingCodeScopedAdmin ? "続ける" : "入室する"}
              </ActionButton>
            </div>
            <p className="a-hint" style={{ marginTop: "1rem" }}>
              {trainingCodeScopedAdmin ? (
                <>
                  デモ: 管理者コードは全員共通 <code>{isSheetStorageBackend() ? SHEET_DEMO_ADMIN_TOKEN : LOCAL_DEMO_ADMIN_CODE}</code>
                  。研修コードは次の画面で入力します（会社・研修回ごとに異なります）。
                </>
              ) : (
                <>
                  初回デモ: 管理者コード <code>{isSheetStorageBackend() ? SHEET_DEMO_ADMIN_TOKEN : LOCAL_DEMO_ADMIN_CODE}</code> /
                  受講者研修コード <code>{isSheetStorageBackend() ? SHEET_DEMO_TRAINING_CODE : LOCAL_DEMO_TRAINING_CODE}</code>
                  （ローカルはアプリごとに storage が分かれるため、管理者で研修コードを変更した場合は受講者側の再読込が必要です）
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (adminGateActive && !adminWorkspaceActive) {
    return (
      <div className="a-shell">
        <div className="a-page a-entry-gate">
          <div className="a-entry-card">
            <h1>研修コード</h1>
            <p>操作・閲覧する研修回の研修コードを入力してください。1 つの研修コードが 1 つの管理画面に対応します。</p>
            {adminLoginError && (
              <p className="a-entry-error" role="alert">
                {adminLoginError}
              </p>
            )}
            <AdminLabel label="研修コード">
              <ImeInput
                className="a-input"
                value={trainingCodeLoginInput}
                onChange={setTrainingCodeLoginInput}
                placeholder="研修コード"
                onKeyDown={(e) => {
                  if (e.key === "Enter") tryTrainingCodeEnter();
                }}
              />
            </AdminLabel>
            <div className="a-actions">
              <ActionButton
                className="a-btn a-btn--primary"
                busy={isPending(ADMIN_ACTION.enterTrainingCode)}
                onClick={tryTrainingCodeEnter}
              >
                入室する
              </ActionButton>
              <button type="button" className="a-btn a-btn--secondary" onClick={returnToAdminCodeEntry}>
                管理者コード入力に戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="a-shell">
      <div className="a-page">
      <header className="a-topbar">
        <div className="a-topbar__inner">
          <span className="a-topbar__brand">ExpertEye360</span>
          <span className="a-topbar__role">管理者</span>
          <div className="a-topbar__actions">
            <button
              type="button"
              className="a-btn a-btn--secondary"
              onClick={returnToAdminCodeEntry}
            >
              管理者コード入力に戻る
            </button>
            <div className="a-topbar__reload">
              <ActionButton
                className="a-btn a-btn--secondary"
                busy={refreshing || isPending(ADMIN_ACTION.reload)}
                spinnerOnDark
                onClick={() => void runPending(ADMIN_ACTION.reload, async () => { await refresh(); })}
              >
                再読込
              </ActionButton>
            </div>
          </div>
        </div>
      </header>

      <main className="a-main">
        {error && <p className="a-entry-error" role="alert">{error}</p>}

        <nav className="a-tabs">
          {(["base", "scenes", "responses"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`a-tab${tab === t ? " a-tab--on" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "base" ? "基本" : t === "scenes" ? "シーン・カード" : "回答"}
            </button>
          ))}
        </nav>

        {tab === "base" && (
          <section className="a-panel">
            <h2>研修回</h2>
            <p className="a-hint">
              操作対象: <strong>{resolveAdminScopeRoom(settings).displayName}</strong>
              {trainingCodeScopedAdmin && "（入室時の研修コードでスコープ済み）"}
            </p>
            <div style={{ marginTop: "1rem", maxWidth: "22rem" }}>
              <h3 style={{ margin: 0 }}>受講者向け研修コード</h3>
              <p className="a-hint" style={{ marginTop: "0.25rem" }}>
                受講者に案内する次の研修コードを入力して保存します。
              </p>
              <AdminLabel label="次の研修コード">
                <ImeInput
                  className="a-input"
                  value={nextAccessCodeInput}
                  onChange={setNextAccessCodeInput}
                  placeholder="研修コード"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveTrainingCode();
                  }}
                />
              </AdminLabel>
              <div className="a-actions">
                <ActionButton
                  className="a-btn a-btn--primary"
                  busy={isPending(ADMIN_ACTION.saveTrainingCode)}
                  onClick={() => void saveTrainingCode()}
                >
                  研修コードを保存
                </ActionButton>
              </div>
            </div>
          </section>
        )}

        {tab === "scenes" && (
          <section className="a-panel a-grid-2">
            <div>
              <div className="a-row a-row--spread">
                <h2 style={{ margin: 0 }}>シーン一覧</h2>
                <ActionButton
                  className="a-btn a-btn--primary"
                  busy={isPending(ADMIN_ACTION.addScene)}
                  onClick={addScene}
                >
                  ＋ 追加
                </ActionButton>
              </div>
              <p className="a-hint">
                受講者画面に反映されるのは<strong>一覧の先頭 1 件</strong>のみです。
                {participantScene && (
                  <>
                    {" "}
                    現在: <strong>{participantScene.displayName}</strong>（設問1〜5）
                  </>
                )}
              </p>
              <ul className="a-scene-list">
                {settings.scenes.map((s, index) => (
                  <li key={s.id} className="a-scene-row">
                    <button
                      type="button"
                      className={`a-scene-pill${s.id === activeSceneId ? " a-scene-pill--on" : ""}`}
                      onClick={() => setActiveSceneId(s.id)}
                    >
                      <span className="a-scene-pill__head">
                        <span className="a-scene-pill__title">
                          {index + 1}. {s.displayName}
                        </span>
                        {index === PARTICIPANT_SCENE_INDEX && (
                          <span className="a-scene-pill__badge">受講者UI</span>
                        )}
                      </span>
                      <span className="a-scene-pill__meta">{s.vistaSceneName}</span>
                    </button>
                    {index > PARTICIPANT_SCENE_INDEX && (
                      <ActionButton
                        className="a-btn a-btn--secondary a-btn--compact"
                        busy={isPending(ADMIN_ACTION.promoteScene)}
                        onClick={() => promoteSceneToParticipant(s.id)}
                      >
                        受講者に使う
                      </ActionButton>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="a-scene-editor">
              {!activeScene || !draft ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>シーンがありません。</p>
              ) : (
                <>
                  <div className="a-scene-editor__head a-row a-row--spread">
                    <h2 style={{ margin: 0 }}>編集: {draft.displayName}</h2>
                    <ActionButton
                      className="a-btn a-btn--danger"
                      busy={isPending(ADMIN_ACTION.removeScene)}
                      onClick={() => removeScene(activeScene.id)}
                    >
                      削除
                    </ActionButton>
                  </div>

                  <div className="a-scene-editor__scroll">
                    {activeSceneIndex > PARTICIPANT_SCENE_INDEX && (
                      <p className="a-callout a-callout--warn">
                        このシーンは一覧の先頭ではありません。受講者画面には反映されません。
                        <ActionButton
                          className="a-btn a-btn--secondary a-btn--compact"
                          style={{ marginLeft: "0.5rem" }}
                          busy={isPending(ADMIN_ACTION.promoteScene)}
                          onClick={() => promoteSceneToParticipant(activeScene.id)}
                        >
                          受講者に使う
                        </ActionButton>
                      </p>
                    )}

                    <AdminLabel label="3DVista シーン名・識別名">
                      <ImeInput
                        className="a-input"
                        value={draft.vistaSceneName}
                        onChange={(v) => patchDraft({ vistaSceneName: v })}
                      />
                    </AdminLabel>
                    <AdminLabel label="表示名（管理用）">
                      <ImeInput
                        className="a-input"
                        value={draft.displayName}
                        onChange={(v) => patchDraft({ displayName: v })}
                      />
                    </AdminLabel>
                    <AdminLabel label="工程・エリア">
                      <ImeInput
                        className="a-input"
                        value={draft.processArea}
                        onChange={(v) => patchDraft({ processArea: v })}
                      />
                    </AdminLabel>
                    <AdminLabel label="研修テーマ">
                      <ImeInput
                        className="a-input"
                        value={draft.trainingTheme}
                        onChange={(v) => patchDraft({ trainingTheme: v })}
                      />
                    </AdminLabel>

                    <h3>設問ごとのカード（全 {JUDGMENT_ROUND_COUNT} 問）</h3>
                    <p className="a-hint">
                      受講者画面の設問1〜{JUDGMENT_ROUND_COUNT}に対応します。各設問で気づき・判断基準・共有行動のカードを
                      それぞれ最大5枚まで設定できます。
                    </p>

                    <div className="a-question-tabs">
                      {draft.questions.map((_, qi) => (
                        <button
                          key={qi}
                          type="button"
                          className={`a-question-tab${expandedQuestion === qi ? " a-question-tab--on" : ""}`}
                          onClick={() => setExpandedQuestion(qi)}
                        >
                          設問 {qi + 1}
                        </button>
                      ))}
                    </div>

                    {draft.questions.map((q, qi) =>
                      expandedQuestion === qi ? (
                        <section key={qi} className="a-question-panel">
                          <h4 className="a-question-panel__title">設問 {qi + 1} のカード</h4>
                          <CardSlotsField
                            title="気づきカード"
                            slots={q.awarenessCardSlots}
                            onChange={(awarenessCardSlots) => patchQuestion(qi, { awarenessCardSlots })}
                          />
                          <CardSlotsField
                            title="判断基準カード"
                            slots={q.criteriaCardSlots}
                            onChange={(criteriaCardSlots) => patchQuestion(qi, { criteriaCardSlots })}
                          />
                          <CardSlotsField
                            title="共有・行動カード"
                            slots={q.actionCardSlots}
                            onChange={(actionCardSlots) => patchQuestion(qi, { actionCardSlots })}
                          />
                        </section>
                      ) : null,
                    )}

                    <div className="a-actions">
                      <ActionButton
                        className="a-btn a-btn--primary"
                        busy={isPending(ADMIN_ACTION.saveScene)}
                        onClick={saveSceneDraft}
                      >
                        このシーンを保存
                      </ActionButton>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {tab === "responses" && (
          <section className="a-panel a-grid-2 a-responses-panel">
            <div>
              <h2>回答一覧（{responses.length}）</h2>
              <p className="a-hint">
                {isSheetStorageBackend()
                  ? "Sheet API に保存された受講者回答です。"
                  : "localStorage に保存された受講者回答です。"}
              </p>
              {(loading || refreshing) && (
                <div className="a-responses-loading" role="status" aria-live="polite">
                  <span className="a-spinner" aria-hidden="true" />
                  <span>回答を読み込んでいます…</span>
                </div>
              )}
              <ul className="a-resp-list">
                {responses.map((r) => {
                  const sceneName =
                    settings.scenes.find((s) => s.id === r.sceneId)?.displayName ?? r.sceneId;
                  const sub = r.affiliation?.trim();
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className={`a-resp-item${r.id === selectedResponseId ? " a-resp-item--on" : ""}`}
                        onClick={() => setSelectedResponseId(r.id)}
                      >
                        <span className="a-resp-date">{new Date(r.createdAt).toLocaleString("ja-JP")}</span>
                        <span className="a-resp-name">{r.participantName}</span>
                        <span className="a-resp-scene">{sub ? `${sub} · ${sceneName}` : sceneName}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {responses.length > 0 && (
                <div style={{ marginTop: "0.65rem" }}>
                  <ActionButton
                    className="a-btn a-btn--danger"
                    busy={isPending(ADMIN_ACTION.clearResponses)}
                    onClick={clearAllResponses}
                  >
                    全回答を削除
                  </ActionButton>
                </div>
              )}
            </div>
            <div>
              <h2>回答詳細</h2>
              {!selectedResponse && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>一覧から回答を選択してください。</p>
              )}
              {selectedResponse && !selectedResponseScene && <p>シーンが見つかりません。</p>}
              {selectedResponse && selectedResponseScene && (
                <>
                  <div className="a-actions" style={{ marginBottom: "0.75rem" }}>
                    <ActionButton
                      className="a-btn a-btn--primary"
                      busy={isPending(ADMIN_ACTION.downloadPdf)}
                      onClick={downloadSelectedResponsePdf}
                    >
                      PDFをダウンロード
                    </ActionButton>
                  </div>
                  <ResponseDetail response={selectedResponse} sceneLabel={selectedResponseScene.displayName} />
                </>
              )}
            </div>
          </section>
        )}
      </main>
      </div>
    </div>
  );
}
