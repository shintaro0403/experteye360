export function selectSingle(list: readonly string[], value: string): string[] {
  return list.includes(value) ? [] : [value];
}
