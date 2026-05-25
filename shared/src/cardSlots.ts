import { limitChoices, MAX_CHOICE_CARDS } from "./choices";

export function cardsToSlots(cards: readonly string[]): string[] {
  return Array.from({ length: MAX_CHOICE_CARDS }, (_, index) => cards[index] ?? "");
}

export function slotsToCards(slots: readonly string[]): string[] {
  return limitChoices(slots.map((slot) => slot.trim()).filter(Boolean));
}
