/** 確信度 1〜5 の表示ラベル（README §5・F6） */
export const CONFIDENCE_LABELS = [
  "かなり不安",
  "少し不安",
  "一応判断できる",
  "ある程度自信あり",
  "強く自信あり",
] as const;

export const CONFIDENCE_MIN = 1;
export const CONFIDENCE_MAX = CONFIDENCE_LABELS.length;

export function getConfidenceLabel(level: number): string {
  if (level >= CONFIDENCE_MIN && level <= CONFIDENCE_MAX) {
    return CONFIDENCE_LABELS[level - CONFIDENCE_MIN];
  }
  return `${level}`;
}
