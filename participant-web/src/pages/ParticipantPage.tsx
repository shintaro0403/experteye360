import { useState } from "react";
import { limitChoices } from "@shared/choices";
import { getSceneQuestionCards } from "@shared/sceneQuestions";
import {
  createEmptyRounds,
  JUDGMENT_ROUND_COUNT,
  stepToRoundPhase,
  STEP_CONFIRM,
  STEP_CONFIDENCE,
  STEP_DONE,
  STEP_INTRO,
} from "@shared/judgmentFlow";
import type { JudgmentRound } from "@shared/types";
import { useAppData } from "../hooks/useAppData";

const CONFIDENCE_LABELS = [
  "かなり不安",
  "少し不安",
  "一応判断できる",
  "ある程度自信あり",
  "強く自信あり",
] as const;

const NOTE_PLACEHOLDERS = [
  "例：ラベル位置が通常と違う",
  "例：異音の原因を考えた",
  "例：安全側に判断した",
  "例：次班に共有したい",
  "例：記録を残してから進めたい",
] as const;

function uid() {
  return crypto.randomUUID();
}

function IntroFieldIcon({ kind }: { kind: "person" | "building" }) {
  if (kind === "person") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M5.5 19.5c.6-3.2 3.2-5 6.5-5s5.9 1.8 6.5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M5 20V6.5L12 3l7 3.5V20H5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 10h1.25M9.5 13.25h1.25M13.25 10H14.5M13.25 13.25H14.5M9.5 16.5h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChoiceCard({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`p-chip${selected ? " p-chip--on" : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
    >
      <span className="p-chip__frame">
        <span className="p-chip__inner">
          <span className="p-chip__name">{label}</span>
        </span>
      </span>
    </button>
  );
}

function Nav({
  showBack,
  showNext,
  onBack,
  onNext,
  submitLabel = "next",
  round,
  title,
  titleRequired,
  titleOptional,
  warn,
}: {
  showBack: boolean;
  showNext: boolean;
  onBack: () => void;
  onNext: () => void;
  submitLabel?: string;
  round?: number;
  title?: string;
  titleRequired?: boolean;
  titleOptional?: boolean;
  warn?: string | null;
}) {
  return (
    <div className={`p-nav-bar${warn ? " p-nav-bar--warn" : ""}`}>
      {warn && (
        <p className="p-nav-warn" role="alert">
          {warn}
        </p>
      )}
      <div className={`p-nav${title ? " p-nav--with-meta" : ""}`}>
        {title && (
          <p className="p-step-meta" aria-live="polite">
            {round !== undefined && (
              <>
                <span className="p-step-meta__round">
                  設問 {round + 1}/{JUDGMENT_ROUND_COUNT}
                </span>
                <span className="p-step-meta__sep" aria-hidden="true">
                  ·
                </span>
              </>
            )}
            <span className="p-step-meta__title">{title}</span>
            {titleRequired && <span className="p-step-meta__badge p-step-meta__badge--required">（必須）</span>}
            {titleOptional && <span className="p-step-meta__badge p-step-meta__badge--optional">（任意）</span>}
          </p>
        )}
        <div className="p-nav__actions">
          {showBack && (
            <button type="button" className="p-btn p-btn--ghost" onClick={onBack}>
              back
            </button>
          )}
          {showNext && (
            <button type="button" className="p-btn p-btn--primary" onClick={onNext}>
              {submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChipStep({
  title,
  round,
  choices,
  selected,
  onSelect,
  onBack,
  onNext,
  warn,
}: {
  title: string;
  round: number;
  choices: string[];
  selected: string[];
  onSelect: (label: string) => void;
  onBack: () => void;
  onNext: () => void;
  warn?: string | null;
}) {
  return (
    <div className="p-form p-form--chips">
      <div className="p-chips">
        {choices.map((l) => (
          <ChoiceCard
            key={l}
            label={l}
            selected={selected.includes(l)}
            onToggle={() => onSelect(l)}
          />
        ))}
      </div>
      <Nav
        showBack
        showNext
        round={round}
        title={title}
        titleRequired
        onBack={onBack}
        onNext={onNext}
        warn={warn}
      />
    </div>
  );
}

function NoteStep({
  round,
  value,
  onChange,
  placeholder,
  onBack,
  onNext,
}: {
  round: number;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="p-form p-form--note">
      <label className="p-field p-field--note">
        <span className="p-field__label">
          一言メモ
          <span className="p-field__label-optional">（任意）</span>
        </span>
        <textarea
          className="p-field__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </label>
      <Nav
        showBack
        showNext
        round={round}
        title="一言メモ"
        titleOptional
        onBack={onBack}
        onNext={onNext}
      />
    </div>
  );
}

function patchRound(
  rounds: JudgmentRound[],
  roundIdx: number,
  patch: Partial<JudgmentRound>,
): JudgmentRound[] {
  return rounds.map((r, i) => (i === roundIdx ? { ...r, ...patch } : r));
}

function selectSingle(list: string[], v: string): string[] {
  return list.includes(v) ? [] : [v];
}

export function ParticipantPage() {
  const { settings, addResponse } = useAppData();
  const [step, setStep] = useState(STEP_INTRO);
  const [participantName, setParticipantName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [rounds, setRounds] = useState<JudgmentRound[]>(createEmptyRounds);
  const [confidence, setConfidence] = useState(3);
  const [fieldWarn, setFieldWarn] = useState<string | null>(null);

  const scene = settings.scenes[0] ?? null;

  const goBack = () => {
    setFieldWarn(null);
    setStep((s) => Math.max(STEP_INTRO, s - 1));
  };

  const advanceStep = () => {
    if (step === STEP_CONFIRM) submit();
    else setStep((s) => s + 1);
  };

  const validateStep = (): string | null => {
    if (step === STEP_INTRO) {
      if (!participantName.trim()) return "名前を入力してください";
      if (!affiliation.trim()) return "所属を入力してください";
      return null;
    }
    const phase = stepToRoundPhase(step);
    if (!phase) return null;
    const roundData = rounds[phase.round];
    if (phase.phase === "awareness" && roundData.awarenessSelection.length === 0) {
      return "気づきカードを1つ選んでください";
    }
    if (phase.phase === "action" && roundData.actionSelection.length === 0) {
      return "共有・行動カードを1つ選んでください";
    }
    if (phase.phase === "criteria" && roundData.criteriaOrdered.length === 0) {
      return "判断基準カードを1つ選んでください";
    }
    return null;
  };

  const tryNext = () => {
    const msg = validateStep();
    if (msg) {
      setFieldWarn(msg);
      return;
    }
    setFieldWarn(null);
    advanceStep();
  };

  const updateRound = (roundIdx: number, patch: Partial<JudgmentRound>) => {
    setRounds((prev) => patchRound(prev, roundIdx, patch));
  };

  const resetForm = () => {
    setStep(STEP_INTRO);
    setParticipantName("");
    setAffiliation("");
    setRounds(createEmptyRounds());
    setConfidence(3);
    setFieldWarn(null);
  };

  const submit = () => {
    if (!scene) return;
    const awarenessNote = rounds
      .map((r, i) => (r.roundNote.trim() ? `【設問${i + 1}】${r.roundNote.trim()}` : ""))
      .filter(Boolean)
      .join("\n");

    addResponse({
      id: uid(),
      createdAt: new Date().toISOString(),
      participantName: participantName.trim(),
      affiliation: affiliation.trim(),
      sceneId: scene.id,
      rounds,
      confidenceLevel: confidence,
      attentionSelected: [],
      attentionNote: "",
      awarenessSelections: rounds.flatMap((r) => r.awarenessSelection),
      awarenessNote,
      criteriaOrdered: rounds.flatMap((r) => r.criteriaOrdered),
      criteriaNote: "",
      actionsSelected: rounds.flatMap((r) => r.actionSelection),
      actionsNote: "",
    });
    setStep(STEP_DONE);
  };

  const rp = stepToRoundPhase(step);

  return (
    <div className="p-shell">
      <section className="p-strip">
        <div className="p-body">
          {!scene && (
            <p className="p-warn">シーンが未設定です。管理者 iframe で登録してください。</p>
          )}

          {scene && step === STEP_INTRO && (
            <div className="p-form p-form--intro">
              <div className="p-intro-card">
                <label className="p-field p-field--compact">
                  <span className="p-field__head">
                    <span className="p-field__icon">
                      <IntroFieldIcon kind="person" />
                    </span>
                    <span className="p-field__label">
                      名前
                      <span className="p-field__label-required">（必須）</span>
                    </span>
                  </span>
                  <input
                    className="p-field__input"
                    value={participantName}
                    onChange={(e) => {
                      setParticipantName(e.target.value);
                      if (fieldWarn) setFieldWarn(null);
                    }}
                    placeholder="例：山田 太郎"
                    required
                  />
                </label>
                <label className="p-field p-field--compact">
                  <span className="p-field__head">
                    <span className="p-field__icon">
                      <IntroFieldIcon kind="building" />
                    </span>
                    <span className="p-field__label">
                      所属
                      <span className="p-field__label-required">（必須）</span>
                    </span>
                  </span>
                  <input
                    className="p-field__input"
                    value={affiliation}
                    onChange={(e) => {
                      setAffiliation(e.target.value);
                      if (fieldWarn) setFieldWarn(null);
                    }}
                    placeholder="例：営業部"
                    required
                  />
                </label>
              </div>
              <Nav showBack={false} showNext onBack={() => {}} onNext={tryNext} warn={fieldWarn} />
            </div>
          )}

          {scene && rp?.phase === "awareness" && (
            <ChipStep
              title="気づきカード"
              round={rp.round}
              choices={limitChoices(getSceneQuestionCards(scene, rp.round).awarenessCards)}
              selected={rounds[rp.round].awarenessSelection}
              onSelect={(l) => {
                updateRound(rp.round, {
                  awarenessSelection: selectSingle(rounds[rp.round].awarenessSelection, l),
                });
                if (fieldWarn) setFieldWarn(null);
              }}
              onBack={goBack}
              onNext={tryNext}
              warn={fieldWarn}
            />
          )}

          {scene && rp?.phase === "action" && (
            <ChipStep
              title="共有・行動カード"
              round={rp.round}
              choices={limitChoices(getSceneQuestionCards(scene, rp.round).actionCards)}
              selected={rounds[rp.round].actionSelection}
              onSelect={(l) => {
                updateRound(rp.round, {
                  actionSelection: selectSingle(rounds[rp.round].actionSelection, l),
                });
                if (fieldWarn) setFieldWarn(null);
              }}
              onBack={goBack}
              onNext={tryNext}
              warn={fieldWarn}
            />
          )}

          {scene && rp?.phase === "criteria" && (
            <ChipStep
              title="判断基準カード"
              round={rp.round}
              choices={limitChoices(getSceneQuestionCards(scene, rp.round).criteriaCards)}
              selected={rounds[rp.round].criteriaOrdered}
              onSelect={(l) => {
                updateRound(rp.round, {
                  criteriaOrdered: selectSingle(rounds[rp.round].criteriaOrdered, l),
                });
                if (fieldWarn) setFieldWarn(null);
              }}
              onBack={goBack}
              onNext={tryNext}
              warn={fieldWarn}
            />
          )}

          {scene && rp?.phase === "note" && (
            <NoteStep
              round={rp.round}
              value={rounds[rp.round].roundNote}
              onChange={(v) => updateRound(rp.round, { roundNote: v })}
              placeholder={NOTE_PLACEHOLDERS[rp.round] ?? NOTE_PLACEHOLDERS[0]}
              onBack={goBack}
              onNext={tryNext}
            />
          )}

          {scene && step === STEP_CONFIDENCE && (
            <div className="p-form p-form--note">
              <div className="p-conf" role="group" aria-label="確信度">
                {CONFIDENCE_LABELS.map((label, idx) => {
                  const v = idx + 1;
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`p-conf__btn${confidence === v ? " p-conf__btn--on" : ""}`}
                      onClick={() => setConfidence(v)}
                      aria-pressed={confidence === v}
                      title={label}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
              <Nav showBack showNext title="確信度" onBack={goBack} onNext={tryNext} />
            </div>
          )}

          {scene && step === STEP_CONFIRM && (
            <div className="p-form p-form--note">
              <p className="p-confirm-text">内容を送信します（設問 {JUDGMENT_ROUND_COUNT} 件）</p>
              <Nav
                showBack
                showNext
                title="送信"
                onBack={goBack}
                onNext={tryNext}
                submitLabel="回答を送信"
              />
            </div>
          )}

          {step === STEP_DONE && (
            <div className="p-form p-form--done">
              <div className="p-done-icon">✓</div>
              <h2 className="p-form__title">送信完了</h2>
              <p className="p-done-text">回答を保存しました。講師は管理者画面で確認できます。</p>
              <div className="p-nav p-nav--center">
                <button type="button" className="p-btn p-btn--primary" onClick={resetForm}>
                  別の回答を入力
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
