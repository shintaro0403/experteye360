import { useMemo, useState } from "react";
import { limitChoices } from "@shared/choices";
import { useAppData } from "../hooks/useAppData";

const CONFIDENCE_LABELS = [
  "かなり不安",
  "少し不安",
  "一応判断できる",
  "ある程度自信あり",
  "強く自信あり",
] as const;

function uid() {
  return crypto.randomUUID();
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
  back,
  next,
  onBack,
  onNext,
  submitLabel = "next",
}: {
  back?: number;
  next?: number | "submit";
  onBack: (step: number) => void;
  onNext: (target: number | "submit") => void;
  submitLabel?: string;
}) {
  return (
    <div className="p-nav-bar">
      <div className="p-nav">
        {back !== undefined && (
          <button type="button" className="p-btn p-btn--ghost" onClick={() => onBack(back)}>
            back
          </button>
        )}
        {next === "submit" ? (
          <button type="button" className="p-btn p-btn--primary" onClick={() => onNext("submit")}>
            {submitLabel}
          </button>
        ) : next !== undefined ? (
          <button type="button" className="p-btn p-btn--primary" onClick={() => onNext(next)}>
            next
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ChipStep({
  choices,
  selected,
  onSelect,
  back,
  next,
  onBack,
  onNext,
}: {
  choices: string[];
  selected: string[];
  onSelect: (label: string) => void;
  back: number;
  next: number;
  onBack: (step: number) => void;
  onNext: (target: number) => void;
}) {
  return (
    <div className="p-form">
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
      <Nav back={back} next={next} onBack={onBack} onNext={onNext} />
    </div>
  );
}

function NoteStep({
  value,
  onChange,
  placeholder,
  back,
  next,
  onBack,
  onNext,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  back: number;
  next: number | "submit";
  onBack: (step: number) => void;
  onNext: (target: number | "submit") => void;
}) {
  return (
    <div className="p-form p-form--note">
      <label className="p-field p-field--note">
        <span className="p-field__label">一言メモ</span>
        <textarea
          className="p-field__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </label>
      <Nav back={back} next={next} onBack={onBack} onNext={onNext} />
    </div>
  );
}

export function ParticipantPage() {
  const { settings, addResponse } = useAppData();
  const [step, setStep] = useState(0);
  const [participantName, setParticipantName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [attention, setAttention] = useState<string[]>([]);
  const [attentionNote, setAttentionNote] = useState("");
  const [awareness, setAwareness] = useState<string[]>([]);
  const [awarenessNote, setAwarenessNote] = useState("");
  const [criteriaOrder, setCriteriaOrder] = useState<string[]>([]);
  const [criteriaNote, setCriteriaNote] = useState("");
  const [actions, setActions] = useState<string[]>([]);
  const [actionsNote, setActionsNote] = useState("");
  const [confidence, setConfidence] = useState(3);

  const scene = settings.scenes[0] ?? null;

  const attentionChoices = useMemo(
    () => (scene ? limitChoices(scene.attentionLabels) : []),
    [scene],
  );
  const awarenessChoices = useMemo(
    () => (scene ? limitChoices(scene.awarenessCards) : []),
    [scene],
  );
  const criteriaChoices = useMemo(
    () => (scene ? limitChoices(scene.criteriaCards) : []),
    [scene],
  );
  const actionChoices = useMemo(
    () => (scene ? limitChoices(scene.actionCards) : []),
    [scene],
  );

  const selectSingle = (list: string[], v: string, set: (n: string[]) => void) => {
    set(list.includes(v) ? [] : [v]);
  };

  const goBack = (target: number) => setStep(target);
  const goNext = (target: number | "submit") => {
    if (target === "submit") submit();
    else setStep(target);
  };

  const resetForm = () => {
    setStep(0);
    setParticipantName("");
    setAffiliation("");
    setAttention([]);
    setAttentionNote("");
    setAwareness([]);
    setAwarenessNote("");
    setCriteriaOrder([]);
    setCriteriaNote("");
    setActions([]);
    setActionsNote("");
    setConfidence(3);
  };

  const submit = () => {
    if (!scene) return;
    addResponse({
      id: uid(),
      createdAt: new Date().toISOString(),
      participantName: participantName.trim() || "（無記名）",
      affiliation: affiliation.trim(),
      sceneId: scene.id,
      attentionSelected: attention,
      attentionNote,
      awarenessSelections: awareness,
      awarenessNote,
      criteriaOrdered: criteriaOrder,
      criteriaNote,
      actionsSelected: actions,
      actionsNote,
      confidenceLevel: confidence,
    });
    setStep(11);
  };

  return (
    <div className="p-shell">
      <section className="p-strip">
        <div className="p-body">
          {!scene && (
            <p className="p-warn">シーンが未設定です。管理者 iframe で登録してください。</p>
          )}

          {scene && step === 0 && (
            <div className="p-form p-form--intro">
              <div className="p-intro-card">
                <label className="p-field p-field--compact">
                  <span className="p-field__label">名前</span>
                  <input
                    className="p-field__input"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder="任意"
                  />
                </label>
                <label className="p-field p-field--compact p-field--scene">
                  <span className="p-field__label">所属</span>
                  <input
                    className="p-field__input"
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                    placeholder="営業部"
                  />
                </label>
              </div>
              <div className="p-nav-bar">
                <div className="p-nav">
                  <button type="button" className="p-btn p-btn--primary" onClick={() => setStep(1)}>
                    next
                  </button>
                </div>
              </div>
            </div>
          )}

          {scene && step === 1 && (
            <ChipStep
              choices={attentionChoices}
              selected={attention}
              onSelect={(l) => selectSingle(attention, l, setAttention)}
              back={0}
              next={2}
              onBack={goBack}
              onNext={goNext}
            />
          )}

          {scene && step === 2 && (
            <NoteStep
              value={attentionNote}
              onChange={setAttentionNote}
              placeholder="例：配管の振動が気になった"
              back={1}
              next={3}
              onBack={goBack}
              onNext={goNext}
            />
          )}

          {scene && step === 3 && (
            <ChipStep
              choices={awarenessChoices}
              selected={awareness}
              onSelect={(l) => selectSingle(awareness, l, setAwareness)}
              back={2}
              next={4}
              onBack={goBack}
              onNext={goNext}
            />
          )}

          {scene && step === 4 && (
            <NoteStep
              value={awarenessNote}
              onChange={setAwarenessNote}
              placeholder="例：異音の原因を考えた"
              back={3}
              next={5}
              onBack={goBack}
              onNext={goNext}
            />
          )}

          {scene && step === 5 && (
            <ChipStep
              choices={criteriaChoices}
              selected={criteriaOrder}
              onSelect={(l) => selectSingle(criteriaOrder, l, setCriteriaOrder)}
              back={4}
              next={6}
              onBack={goBack}
              onNext={goNext}
            />
          )}

          {scene && step === 6 && (
            <NoteStep
              value={criteriaNote}
              onChange={setCriteriaNote}
              placeholder="例：安全側に判断した"
              back={5}
              next={7}
              onBack={goBack}
              onNext={goNext}
            />
          )}

          {scene && step === 7 && (
            <ChipStep
              choices={actionChoices}
              selected={actions}
              onSelect={(l) => selectSingle(actions, l, setActions)}
              back={6}
              next={8}
              onBack={goBack}
              onNext={goNext}
            />
          )}

          {scene && step === 8 && (
            <NoteStep
              value={actionsNote}
              onChange={setActionsNote}
              placeholder="例：次班に共有したい"
              back={7}
              next={9}
              onBack={goBack}
              onNext={goNext}
            />
          )}

          {scene && step === 9 && (
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
              <Nav back={8} next={10} onBack={goBack} onNext={goNext} />
            </div>
          )}

          {scene && step === 10 && (
            <div className="p-form p-form--note">
              <p className="p-confirm-text">内容を送信します</p>
              <Nav back={9} next="submit" onBack={goBack} onNext={goNext} submitLabel="回答を送信" />
            </div>
          )}

          {step === 11 && (
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
