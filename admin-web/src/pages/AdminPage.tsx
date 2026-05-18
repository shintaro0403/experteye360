import React, { useEffect, useMemo, useState } from "react";
import { limitChoices } from "@shared/choices";
import { computeDiff } from "@shared/diff";
import { resetDemoData } from "@shared/storage";
import type { Scene, VeteranTemplate } from "@shared/types";
import { useAppData } from "../hooks/useAppData";

function linesToArr(s: string) {
  return s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function arrToLines(a: string[]) {
  return a.join("\n");
}

function uid() {
  return crypto.randomUUID();
}

function participantHref() {
  const v = import.meta.env.VITE_PARTICIPANT_ORIGIN as string | undefined;
  if (v) return v.replace(/\/$/, "") + "/";
  return "/participant/";
}

const emptyTemplate = (): VeteranTemplate => ({
  focusPoints: [],
  criteriaPriority: [],
  recommendedActions: [],
  shareRoutes: [],
  commonMisses: [],
  instructorComment: "",
  ojtChecklist: [],
});

export function AdminPage() {
  const { settings, setSettings, responses, replaceResponses, refresh } = useAppData();
  const [tab, setTab] = useState<"base" | "scenes" | "responses">("base");
  const [tourUrl, setTourUrl] = useState(settings.tourUrl);
  const [activeSceneId, setActiveSceneId] = useState(settings.scenes[0]?.id ?? "");
  const [draft, setDraft] = useState<Partial<Scene>>({});

  const activeScene = useMemo(
    () => settings.scenes.find((s) => s.id === activeSceneId),
    [activeSceneId, settings.scenes],
  );

  useEffect(() => {
    setTourUrl(settings.tourUrl);
  }, [settings.tourUrl]);

  useEffect(() => {
    if (!activeScene) {
      setDraft({});
      return;
    }
    setDraft({
      vistaSceneName: activeScene.vistaSceneName,
      displayName: activeScene.displayName,
      processArea: activeScene.processArea,
      trainingTheme: activeScene.trainingTheme,
      attentionLabels: [...activeScene.attentionLabels],
      awarenessCards: [...activeScene.awarenessCards],
      criteriaCards: [...activeScene.criteriaCards],
      actionCards: [...activeScene.actionCards],
      veteranTemplate: { ...activeScene.veteranTemplate },
    });
  }, [activeScene]);

  const merged = useMemo((): Scene | null => {
    if (!activeScene) return null;
    return {
      ...activeScene,
      ...draft,
      veteranTemplate: {
        ...activeScene.veteranTemplate,
        ...(draft.veteranTemplate ?? {}),
      },
    };
  }, [activeScene, draft]);

  const saveTourUrl = () => {
    setSettings({ ...settings, tourUrl: tourUrl.trim() });
  };

  const saveSceneDraft = () => {
    if (!merged) return;
    const nextScenes = settings.scenes.map((s) => (s.id === merged.id ? merged : s));
    setSettings({ ...settings, scenes: nextScenes });
    refresh();
  };

  const addScene = () => {
    const s: Scene = {
      id: uid(),
      vistaSceneName: "新規シーン（3DVista名を入力）",
      displayName: "新規シーン",
      processArea: "",
      trainingTheme: "",
      attentionLabels: ["注目ポイント1"],
      awarenessCards: ["気づきカード1"],
      criteriaCards: ["品質", "安全"],
      actionCards: ["班長へ相談する"],
      veteranTemplate: emptyTemplate(),
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

  const patchDraft = (patch: Partial<Scene>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };

  const patchTemplate = (patch: Partial<VeteranTemplate>) => {
    setDraft((d) => ({
      ...d,
      veteranTemplate: {
        ...(activeScene?.veteranTemplate ?? emptyTemplate()),
        ...(d.veteranTemplate ?? {}),
        ...patch,
      },
    }));
  };

  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const selectedResponse = responses.find((r) => r.id === selectedResponseId) ?? null;
  const diffScene =
    selectedResponse && settings.scenes.find((s) => s.id === selectedResponse.sceneId);
  const diff = diffScene && selectedResponse ? computeDiff(diffScene, selectedResponse) : null;

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="a-label">
      {label}
      {children}
    </label>
  );

  const aInput = (value: string, onChange: (v: string) => void) => (
    <input className="a-input" value={value} onChange={(e) => onChange(e.target.value)} />
  );

  const aTextarea = (value: string, onChange: (v: string) => void, rows = 3) => (
    <textarea className="a-input a-textarea" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
  );

  return (
    <div className="a-page">
      <header className="a-topbar">
        <div className="a-topbar__inner">
          <span className="a-topbar__brand">ExpertEye360</span>
          <span className="a-topbar__role">管理者</span>
          <div className="a-topbar__actions">
            <button type="button" className="a-btn a-btn--secondary" onClick={() => refresh()}>
              再読込
            </button>
            <button
              type="button"
              className="a-btn a-btn--danger"
              onClick={() => {
                if (confirm("ローカルデータをデモ初期状態に戻しますか？")) {
                  resetDemoData();
                  refresh();
                }
              }}
            >
              デモリセット
            </button>
            <a className="a-btn a-btn--secondary" href={participantHref()}>
              受講者へ →
            </a>
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
              {t === "base" ? "ツアーURL" : t === "scenes" ? "シーン・カード" : "回答・差分"}
            </button>
          ))}
        </nav>

        {tab === "base" && (
          <section className="a-panel">
            <h2>3DVista ツアー URL</h2>
            <p className="a-hint">受講者 iframe の 3DVista 埋め込み元 URL を登録します。</p>
            <div className="a-row" style={{ marginTop: "0.65rem" }}>
              <input
                className="a-input a-grow"
                value={tourUrl}
                onChange={(e) => setTourUrl(e.target.value)}
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
              <ul className="a-scene-list">
                {settings.scenes.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`a-scene-pill${s.id === activeSceneId ? " a-scene-pill--on" : ""}`}
                      onClick={() => setActiveSceneId(s.id)}
                    >
                      {s.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              {!activeScene || !merged ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>シーンがありません。</p>
              ) : (
                <>
                  <div className="a-row a-row--spread">
                    <h2 style={{ margin: 0 }}>編集: {merged.displayName}</h2>
                    <button type="button" className="a-btn a-btn--danger" onClick={() => removeScene(merged.id)}>
                      削除
                    </button>
                  </div>

                  <F label="3DVista シーン名・識別名">{aInput(merged.vistaSceneName, (v) => patchDraft({ vistaSceneName: v }))}</F>
                  <F label="表示名（管理・受講者向け）">{aInput(merged.displayName, (v) => patchDraft({ displayName: v }))}</F>
                  <F label="工程・エリア">{aInput(merged.processArea, (v) => patchDraft({ processArea: v }))}</F>
                  <F label="研修テーマ">{aInput(merged.trainingTheme, (v) => patchDraft({ trainingTheme: v }))}</F>

                  <h3>カード文言（1行1項目）</h3>
                  <F label="注目ポイント（最大5件）">{aTextarea(arrToLines(merged.attentionLabels), (v) => patchDraft({ attentionLabels: limitChoices(linesToArr(v)) }))}</F>
                  <F label="気づきカード（最大5件）">{aTextarea(arrToLines(merged.awarenessCards), (v) => patchDraft({ awarenessCards: limitChoices(linesToArr(v)) }))}</F>
                  <F label="判断基準カード（最大5件）">{aTextarea(arrToLines(merged.criteriaCards), (v) => patchDraft({ criteriaCards: limitChoices(linesToArr(v)) }))}</F>
                  <F label="共有・行動カード（最大5件）">{aTextarea(arrToLines(merged.actionCards), (v) => patchDraft({ actionCards: limitChoices(linesToArr(v)) }))}</F>

                  <h3>ベテラン判断テンプレート</h3>
                  <F label="注目ポイント（ベテラン）">{aTextarea(arrToLines(merged.veteranTemplate.focusPoints), (v) => patchTemplate({ focusPoints: linesToArr(v) }), 2)}</F>
                  <F label="判断基準の優先順（上から順）">{aTextarea(arrToLines(merged.veteranTemplate.criteriaPriority), (v) => patchTemplate({ criteriaPriority: linesToArr(v) }), 2)}</F>
                  <F label="推奨行動">{aTextarea(arrToLines(merged.veteranTemplate.recommendedActions), (v) => patchTemplate({ recommendedActions: linesToArr(v) }), 2)}</F>
                  <F label="報連相ルート例">{aTextarea(arrToLines(merged.veteranTemplate.shareRoutes), (v) => patchTemplate({ shareRoutes: linesToArr(v) }), 2)}</F>
                  <F label="よくある見落とし">{aTextarea(arrToLines(merged.veteranTemplate.commonMisses), (v) => patchTemplate({ commonMisses: linesToArr(v) }), 2)}</F>
                  <F label="講師用コメント">{aTextarea(merged.veteranTemplate.instructorComment, (v) => patchTemplate({ instructorComment: v }), 2)}</F>
                  <F label="OJT確認項目">{aTextarea(arrToLines(merged.veteranTemplate.ojtChecklist), (v) => patchTemplate({ ojtChecklist: linesToArr(v) }), 2)}</F>

                  <div className="a-actions">
                    <button type="button" className="a-btn a-btn--primary" onClick={saveSceneDraft}>
                      このシーンを保存
                    </button>
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
                  const dept =
                    r.affiliation?.trim() ||
                    (settings.scenes.find((s) => s.id === r.sceneId)?.displayName ?? r.sceneId);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className={`a-resp-item${r.id === selectedResponseId ? " a-resp-item--on" : ""}`}
                        onClick={() => setSelectedResponseId(r.id)}
                      >
                        <span className="a-resp-date">{new Date(r.createdAt).toLocaleString("ja-JP")}</span>
                        <span className="a-resp-name">{r.participantName}</span>
                        <span className="a-resp-scene">{dept}</span>
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
              <h2>差分プレビュー</h2>
              {!selectedResponse && <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>一覧から回答を選択してください。</p>}
              {selectedResponse && !diffScene && <p>シーンが見つかりません。</p>}
              {selectedResponse && diffScene && diff && (
                <div className="a-diff">
                  <h3>見落としがちな注目</h3>
                  <ul>{diff.missedAttention.length ? diff.missedAttention.map((x) => <li key={x}>{x}</li>) : <li>なし</li>}</ul>
                  <h3>受講者のみ選んだ注目</h3>
                  <ul>{diff.extraAttention.length ? diff.extraAttention.map((x) => <li key={x}>{x}</li>) : <li>なし</li>}</ul>
                  <h3>判断基準の差</h3>
                  <ul>{diff.missedCriteria.length ? diff.missedCriteria.map((x) => <li key={x}>{x}</li>) : <li>なし</li>}</ul>
                  <p>{diff.criteriaOrderHint}</p>
                  <h3>推奨行動の差</h3>
                  <ul>{diff.missedRecommendedActions.length ? diff.missedRecommendedActions.map((x) => <li key={x}>{x}</li>) : <li>なし</li>}</ul>
                  <h3>生データ</h3>
                  <pre className="a-json-pre">{JSON.stringify(selectedResponse, null, 2)}</pre>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
