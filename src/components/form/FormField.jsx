import React from "react";
import "../../styles/helpers.css";

export default function FormField({
  id,
  label,
  hint,
  error,
  required = false,
  children,
  className = "",
}) {
  const inputId = id || React.useId();
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </label>
      )}
      {/* Clona o filho para injetar id se possível */}
      {children && React.isValidElement(children)
        ? React.cloneElement(children, { id: inputId })
        : children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
