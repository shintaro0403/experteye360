import { useState } from "react";
import { limitChoices } from "@shared/choices";
import { CONFIDENCE_LABELS } from "@shared/confidence";
import { buildSubmission } from "@shared/submission";
import {
  getVerifiedRoomId,
  setVerifiedRoomId,
} from "@shared/roomEntry";
import { getSceneQuestionCards } from "@shared/sceneQuestions";
import { selectSingle } from "@shared/selection";
import { verifyTrainingCodeAsync } from "@shared/storage";
import { validateParticipantStep } from "@shared/validateStep";
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

function IntroFieldIcon({ kind }: { kind: "person" | "building" | "key" }) {
  if (kind === "key") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M7 11V8a5 5 0 0 1 10 0v3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <rect
          x="5"
          y="11"
          width="14"
          height="10"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <circle cx="12" cy="15.5" r="1.25" fill="currentColor" />
      </svg>
    );
  }
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

function ConfidenceStep({
  confidence,
  onSelect,
  onBack,
  onNext,
  warn,
}: {
  confidence: number | null;
  onSelect: (level: number) => void;
  onBack: () => void;
  onNext: () => void;
  warn?: string | null;
}) {
  return (
    <div className="p-form p-form--chips">
      <div className="p-chips" role="radiogroup" aria-label="確信度">
        {CONFIDENCE_LABELS.map((label, idx) => {
          const level = idx + 1;
          return (
            <ChoiceCard
              key={label}
              label={label}
              selected={confidence === level}
              onToggle={() => onSelect(level)}
            />
          );
        })}
      </div>
      <Nav
        showBack
        showNext
        title="確信度"
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

export function ParticipantPage() {
  const { settings, addResponse, loading, error } = useAppData();
  const [verifiedRoomId, setVerifiedRoomIdState] = useState<string | null>(() => getVerifiedRoomId());
  const [trainingCode, setTrainingCode] = useState("");
  const [step, setStep] = useState(STEP_INTRO);
  const [participantName, setParticipantName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [rounds, setRounds] = useState<JudgmentRound[]>(createEmptyRounds);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [fieldWarn, setFieldWarn] = useState<string | null>(null);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scene = settings.scenes[0] ?? null;
  const profileUnlocked = Boolean(verifiedRoomId);

  const tryVerifyTrainingCode = async () => {
    setIsVerifyingCode(true);
    const result = await verifyTrainingCodeAsync(trainingCode, settings.rooms);
    setIsVerifyingCode(false);
    if (!result.ok) {
      setFieldWarn(result.message);
      return;
    }
    setVerifiedRoomId(result.roomId);
    setVerifiedRoomIdState(result.roomId);
    setFieldWarn(null);
  };

  const goBack = () => {
    setFieldWarn(null);
    setStep((s) => Math.max(STEP_INTRO, s - 1));
  };

  const advanceStep = () => {
    if (step === STEP_CONFIRM) {
      void submit();
      return;
    }
    setStep((s) => s + 1);
  };

  const tryNext = () => {
    const msg = validateParticipantStep({
      step,
      participantName,
      affiliation,
      rounds,
      confidence,
    });
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

  const submit = async () => {
    if (!scene || confidence === null) return;
    try {
      setIsSubmitting(true);
      await addResponse(buildSubmission({
        id: uid(),
        createdAt: new Date().toISOString(),
        participantName,
        affiliation,
        roomId: verifiedRoomId,
        sceneId: scene.id,
        rounds,
        confidenceLevel: confidence,
      }));
      setStep(STEP_DONE);
    } catch (err) {
      setFieldWarn(err instanceof Error ? err.message : "回答の送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const rp = stepToRoundPhase(step);

  return (
    <div className="p-shell">
      <section className="p-strip">
        <div className="p-body">
          {loading && <p className="p-warn">研修データを読み込んでいます。</p>}
          {error && <p className="p-warn">{error}</p>}

          {!scene && (
            <p className="p-warn">シーンが未設定です。管理者 iframe で登録してください。</p>
          )}

          {scene && !profileUnlocked && (
            <div className="p-form p-form--intro">
              <div className="p-intro-card">
                <label className="p-field p-field--compact">
                  <span className="p-field__head">
                    <span className="p-field__icon">
                      <IntroFieldIcon kind="key" />
                    </span>
                    <span className="p-field__label">
                      研修コード
                      <span className="p-field__label-required">（必須）</span>
                    </span>
                  </span>
                  <input
                    className="p-field__input"
                    value={trainingCode}
                    onChange={(e) => {
                      setTrainingCode(e.target.value);
                      if (fieldWarn) setFieldWarn(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void tryVerifyTrainingCode();
                    }}
                    placeholder="例：DEMO-2026"
                    autoComplete="off"
                    required
                  />
                </label>
              </div>
              <Nav
                showBack={false}
                showNext
                onBack={() => {}}
                onNext={() => void tryVerifyTrainingCode()}
                submitLabel={isVerifyingCode ? "確認中..." : "next"}
                warn={fieldWarn}
              />
            </div>
          )}

          {scene && profileUnlocked && step === STEP_INTRO && (
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

          {scene && profileUnlocked && rp?.phase === "awareness" && (
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

          {scene && profileUnlocked && rp?.phase === "action" && (
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

          {scene && profileUnlocked && rp?.phase === "criteria" && (
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

          {scene && profileUnlocked && rp?.phase === "note" && (
            <NoteStep
              round={rp.round}
              value={rounds[rp.round].roundNote}
              onChange={(v) => updateRound(rp.round, { roundNote: v })}
              placeholder={NOTE_PLACEHOLDERS[rp.round] ?? NOTE_PLACEHOLDERS[0]}
              onBack={goBack}
              onNext={tryNext}
            />
          )}

          {scene && profileUnlocked && step === STEP_CONFIDENCE && (
            <ConfidenceStep
              confidence={confidence}
              onSelect={(level) => {
                setConfidence(level);
                if (fieldWarn) setFieldWarn(null);
              }}
              onBack={goBack}
              onNext={tryNext}
              warn={fieldWarn}
            />
          )}

          {scene && profileUnlocked && step === STEP_CONFIRM && (
            <div className="p-form p-form--note">
              <p className="p-confirm-text">内容を送信します（設問 {JUDGMENT_ROUND_COUNT} 件）</p>
              <Nav
                showBack
                showNext
                title="送信"
                onBack={goBack}
                onNext={tryNext}
                submitLabel={isSubmitting ? "送信中..." : "回答を送信"}
              />
            </div>
          )}

          {step === STEP_DONE && (
            <div className="p-form p-form--done">
              <div className="p-done-icon">✓</div>
              <h2 className="p-form__title">送信完了</h2>
              <p className="p-done-text">回答を保存しました。<br></br>講師は管理者画面で確認できます。</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
