import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  /** primary ボタン上のスピナー（白） */
  spinnerOnPrimary?: boolean;
  /** トップバー等の暗背景向け */
  spinnerOnDark?: boolean;
  children: ReactNode;
};

export function ActionButton({
  busy = false,
  spinnerOnPrimary = false,
  spinnerOnDark = false,
  children,
  className = "a-btn",
  disabled,
  type = "button",
  ...rest
}: ActionButtonProps) {
  const spinnerClass = [
    "a-spinner",
    "a-spinner--in-btn",
    spinnerOnPrimary || className.includes("a-btn--primary") ? "a-spinner--on-primary" : "",
    spinnerOnDark ? "a-spinner--on-dark" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={className} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy && <span className={spinnerClass} role="status" aria-label="処理中" />}
      <span>{children}</span>
    </button>
  );
}
