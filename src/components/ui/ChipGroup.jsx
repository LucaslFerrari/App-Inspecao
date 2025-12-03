import React from "react";
import Chip from "./Chip";

/**
 * options: [{value, label}]
 * multiple: boolean
 * value: any (single) | any[] (multiple)
 */
export default function ChipGroup({
  options = [],
  value,
  onChange,
  multiple = false,
  className = "",
}) {
  const isSelected = (v) =>
    multiple ? Array.isArray(value) && value.includes(v) : value === v;

  const handleClick = (v) => {
    if (multiple) {
      const set = new Set(Array.isArray(value) ? value : []);
      set.has(v) ? set.delete(v) : set.add(v);
      onChange?.(Array.from(set));
    } else {
      onChange?.(v === value ? null : v);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((opt) => (
        <Chip
          key={String(opt.value)}
          value={opt.value}
          selected={isSelected(opt.value)}
          onClick={handleClick}
        >
          {opt.label ?? opt.value}
        </Chip>
      ))}
    </div>
  );
}
