import type { ButtonHTMLAttributes } from "react";
import "./Switch.scss";

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
  className = "",
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`dshg-switch-row ${className}`.trim()}
      onClick={() => onCheckedChange(!checked)}
      {...props}
    >
      <span className="dshg-switch-row__label">{label}</span>
      <span className={`dshg-switch ${checked ? "is-on" : ""}`} aria-hidden>
        <span className="dshg-switch__thumb" />
      </span>
    </button>
  );
}
