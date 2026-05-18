/** 受講者が選ぶカードの最大枚数（各ステップ共通） */
export const MAX_CHOICE_CARDS = 5;

export function limitChoices<T>(items: readonly T[]): T[] {
  return items.slice(0, MAX_CHOICE_CARDS);
}
