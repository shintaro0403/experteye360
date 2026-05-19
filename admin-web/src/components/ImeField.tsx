import { useEffect, useRef, useState } from "react";

type BaseProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
};

/** 日本語 IME と英語の連続入力の両方に対応する controlled input */
function useImeControlledValue(value: string, onChange: (value: string) => void) {
  const composingRef = useRef(false);
  const lastEmittedRef = useRef(value);
  const [local, setLocal] = useState(value);

  useEffect(() => {
    if (composingRef.current) return;
    if (value !== lastEmittedRef.current) {
      setLocal(value);
      lastEmittedRef.current = value;
    }
  }, [value]);

  const commit = (next: string) => {
    lastEmittedRef.current = next;
    onChange(next);
  };

  const onInputChange = (next: string) => {
    setLocal(next);
    if (!composingRef.current) commit(next);
  };

  const onCompositionStart = () => {
    composingRef.current = true;
  };

  const onCompositionEnd = (next: string) => {
    composingRef.current = false;
    setLocal(next);
    commit(next);
  };

  return { local, onInputChange, onCompositionStart, onCompositionEnd };
}

export function ImeInput({ value, onChange, className, placeholder }: BaseProps) {
  const { local, onInputChange, onCompositionStart, onCompositionEnd } = useImeControlledValue(
    value,
    onChange,
  );

  return (
    <input
      className={className}
      value={local}
      placeholder={placeholder}
      onChange={(e) => onInputChange(e.target.value)}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={(e) => onCompositionEnd(e.currentTarget.value)}
    />
  );
}

export function ImeTextarea({
  value,
  onChange,
  className,
  placeholder,
  rows = 3,
}: BaseProps & { rows?: number }) {
  const { local, onInputChange, onCompositionStart, onCompositionEnd } = useImeControlledValue(
    value,
    onChange,
  );

  return (
    <textarea
      className={className}
      rows={rows}
      value={local}
      placeholder={placeholder}
      onChange={(e) => onInputChange(e.target.value)}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={(e) => onCompositionEnd(e.currentTarget.value)}
    />
  );
}