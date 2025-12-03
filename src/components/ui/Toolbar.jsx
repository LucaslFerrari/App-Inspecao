import React from "react";
import "../../styles/helpers.css";

export default function Toolbar({
  children,
  className = "",
  stickyTop = false,
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 ${stickyTop ? "sticky top-0 z-40 bg-(--c-bg)/85 backdrop-blur px-2 py-2" : ""} ${className}`}
    >
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/* Botões prontos para usar */
export function PrimaryButton(props){ return <button {...props} className={`btn btn-primary ${props.className||""}`} /> }
export function GhostButton(props){ return <button {...props} className={`btn btn-ghost ${props.className||""}`} /> }
