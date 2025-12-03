import React from "react";
import "../../styles/helpers.css";

export default function Chip({
  selected = false,
  onClick,
  children,
  className = "",
  disabled = false,
  value,
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-disabled={disabled}
      onClick={() => !disabled && onClick?.(value ?? children)}
      className={`chip ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      {children}
    </button>
  );
}
