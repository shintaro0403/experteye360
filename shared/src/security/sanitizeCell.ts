/**
 * SEC-INPUT-01: スプレッドシートの数式インジェクション対策。
 *
 * Google Sheets / Excel は `=` `+` `-` `@` などで始まるセルを数式として解釈する。
 * 参加者名・所属などの自由入力がそのまま書き込まれると、シートを開いた管理者の
 * 環境で意図しない数式が実行され得る（CSV/Formula Injection）。
 *
 * 対策として、危険な先頭文字をもつ「文字列」にはアポストロフィ(')を前置し、
 * セルを必ずテキストとして扱わせる。数値・真偽値などの非文字列はそのまま返す。
 */

const FORMULA_TRIGGER_PREFIXES = ["=", "+", "-", "@", "\t", "\r", "\n"];

export function sanitizeSpreadsheetCell<T>(value: T): T | string {
  if (typeof value !== "string") return value;
  if (value.length === 0) return value;
  const first = value.charAt(0);
  if (FORMULA_TRIGGER_PREFIXES.includes(first)) {
    return `'${value}`;
  }
  return value;
}
