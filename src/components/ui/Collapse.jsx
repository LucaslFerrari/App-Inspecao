import React from "react";

export default function Collapse({
  title,
  children,
  defaultOpen = true,
  className = "",
  onToggle,
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  function toggle() {
    const next = !open;
    setOpen(next);
    onToggle?.(next);
  }

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full px-4 py-3 flex items-center justify-between font-semibold text-primary"
      >
        <span>{title}</span>
        <span className="text-muted">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}
