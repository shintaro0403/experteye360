import React, { useEffect, useMemo, useState } from "react";
import { getConfidenceLabel } from "@shared/confidence";
import { getSubmissionRounds, JUDGMENT_ROUND_COUNT } from "@shared/judgmentFlow";
import type { ParticipantSubmission, Scene } from "@shared/types";
import { CardSlotsField, cardsToSlots, slotsToCards } from "../components/CardSlotsField";
import { ImeInput } from "../components/ImeField";
import { useAppData } from "../hooks/useAppData";

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

const EMPTY_VETERAN_TEMPLATE = {
  focusPoints: [],
  criteriaPriority: [],
  recommendedActions: [],
  shareRoutes: [],
  commonMisses: [],
  instructorComment: "",
  ojtChecklist: [],
} as const;

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

export function AdminPage() {
  const { settings, setSettings, responses, replaceResponses, refresh } = useAppData();
  const [tab, setTab] = useState<"base" | "scenes" | "responses">("base");
  const [tourUrl, setTourUrl] = useState(settings.tourUrl);
  const [activeSceneId, setActiveSceneId] = useState(settings.scenes[0]?.id ?? "");
  const [draft, setDraft] = useState<SceneEditorDraft | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState(0);

  const activeScene = useMemo(
    () => settings.scenes.find((s) => s.id === activeSceneId),
    [activeSceneId, settings.scenes],
  );

  const participantScene = settings.scenes[PARTICIPANT_SCENE_INDEX] ?? null;
  const activeSceneIndex = settings.scenes.findIndex((s) => s.id === activeSceneId);

  useEffect(() => {
    setTourUrl(settings.tourUrl);
  }, [settings.tourUrl]);

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

  const saveTourUrl = () => {
    setSettings({ ...settings, tourUrl: tourUrl.trim() });
  };

  const saveSceneDraft = () => {
    if (!activeScene || !draft) return;
    const merged = editorDraftToScene(activeScene, draft);
    const nextScenes = settings.scenes.map((s) => (s.id === merged.id ? merged : s));
    setSettings({ ...settings, scenes: nextScenes });
    refresh();
  };

  const addScene = () => {
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
    setSettings({ ...settings, scenes: [...settings.scenes, s] });
    setActiveSceneId(s.id);
  };

  const removeScene = (id: string) => {
    if (!confirm("このシーンを削除しますか？")) return;
    const next = settings.scenes.filter((s) => s.id !== id);
    setSettings({ ...settings, scenes: next });
    setActiveSceneId(next[0]?.id ?? "");
  };

  const promoteSceneToParticipant = (id: string) => {
    const idx = settings.scenes.findIndex((s) => s.id === id);
    if (idx <= PARTICIPANT_SCENE_INDEX) return;
    const next = [...settings.scenes];
    const [scene] = next.splice(idx, 1);
    next.unshift(scene);
    setSettings({ ...settings, scenes: next });
    setActiveSceneId(id);
    refresh();
  };

  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const selectedResponse = responses.find((r) => r.id === selectedResponseId) ?? null;
  const selectedResponseScene =
    selectedResponse && settings.scenes.find((s) => s.id === selectedResponse.sceneId);

  return (
    <div className="a-shell">
      <div className="a-page">
      <header className="a-topbar">
        <div className="a-topbar__inner">
          <span className="a-topbar__brand">ExpertEye360</span>
          <span className="a-topbar__role">管理者</span>
          <div className="a-topbar__actions">
            <button type="button" className="a-btn a-btn--secondary" onClick={() => refresh()}>
              再読込
            </button>
          </div>
        </div>
      </header>

      <main className="a-main">
        <nav className="a-tabs">
          {(["base", "scenes", "responses"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`a-tab${tab === t ? " a-tab--on" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "base" ? "ツアーURL" : t === "scenes" ? "シーン・カード" : "回答"}
            </button>
          ))}
        </nav>

        {tab === "base" && (
          <section className="a-panel">
            <h2>3DVista ツアー URL</h2>
            <p className="a-hint">受講者 iframe の 3DVista 埋め込み元 URL を登録します。</p>
            <div className="a-row" style={{ marginTop: "0.65rem" }}>
              <ImeInput
                className="a-input a-grow"
                value={tourUrl}
                onChange={setTourUrl}
                placeholder="https://..."
              />
              <button type="button" className="a-btn a-btn--primary" onClick={saveTourUrl}>
                保存
              </button>
            </div>
          </section>
        )}

        {tab === "scenes" && (
          <section className="a-panel a-grid-2">
            <div>
              <div className="a-row a-row--spread">
                <h2 style={{ margin: 0 }}>シーン一覧</h2>
                <button type="button" className="a-btn a-btn--primary" onClick={addScene}>
                  ＋ 追加
                </button>
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
                      <button
                        type="button"
                        className="a-btn a-btn--secondary a-btn--compact"
                        onClick={() => promoteSceneToParticipant(s.id)}
                      >
                        受講者に使う
                      </button>
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
                    <button type="button" className="a-btn a-btn--danger" onClick={() => removeScene(activeScene.id)}>
                      削除
                    </button>
                  </div>

                  <div className="a-scene-editor__scroll">
                    {activeSceneIndex > PARTICIPANT_SCENE_INDEX && (
                      <p className="a-callout a-callout--warn">
                        このシーンは一覧の先頭ではありません。受講者画面には反映されません。
                        <button
                          type="button"
                          className="a-btn a-btn--secondary a-btn--compact"
                          style={{ marginLeft: "0.5rem" }}
                          onClick={() => promoteSceneToParticipant(activeScene.id)}
                        >
                          受講者に使う
                        </button>
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
                      <button type="button" className="a-btn a-btn--primary" onClick={saveSceneDraft}>
                        このシーンを保存
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {tab === "responses" && (
          <section className="a-panel a-grid-2">
            <div>
              <h2>回答一覧（{responses.length}）</h2>
              <p className="a-hint">localStorage に保存された受講者回答です。</p>
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
                  <button
                    type="button"
                    className="a-btn a-btn--danger"
                    onClick={() => {
                      if (confirm("全回答を削除しますか？")) {
                        replaceResponses([]);
                        setSelectedResponseId(null);
                      }
                    }}
                  >
                    全回答を削除
                  </button>
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
                <ResponseDetail response={selectedResponse} sceneLabel={selectedResponseScene.displayName} />
              )}
            </div>
          </section>
        )}
      </main>
      </div>
    </div>
  );
}
