import { limitChoices, MAX_CHOICE_CARDS } from "@shared/choices";
import { ImeInput } from "./ImeField";

type CardSlotsFieldProps = {
  title: string;
  slots: string[];
  onChange: (slots: string[]) => void;
};

export function CardSlotsField({ title, slots, onChange }: CardSlotsFieldProps) {
  const patchSlot = (index: number, value: string) => {
    const next = [...slots];
    next[index] = value;
    onChange(next);
  };

  return (
    <fieldset className="a-card-slots">
      <legend className="a-card-slots__title">{title}</legend>
      <p className="a-hint a-card-slots__hint">最大 {MAX_CHOICE_CARDS} 件。空欄は保存されません。</p>
      <ol className="a-card-slots__list">
        {slots.map((value, index) => (
          <li key={index} className="a-card-slots__row">
            <span className="a-card-slots__num" aria-hidden="true">
              {index + 1}
            </span>
            <ImeInput
              className="a-input a-card-slots__input"
              value={value}
              placeholder={`${title} ${index + 1}`}
              onChange={(v) => patchSlot(index, v)}
            />
          </li>
        ))}
      </ol>
    </fieldset>
  );
}

export function cardsToSlots(cards: readonly string[]): string[] {
  return Array.from({ length: MAX_CHOICE_CARDS }, (_, i) => cards[i] ?? "");
}

export function slotsToCards(slots: readonly string[]): string[] {
  return limitChoices(slots.map((s) => s.trim()).filter(Boolean));
}
