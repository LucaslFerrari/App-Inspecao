import React from "react";
import FormField from "./FormField";
import ChipGroup from "../ui/ChipGroup";

/**
 * props:
 *  label, hint, error, required
 *  options = [{value, label}]
 *  value (single | array), onChange, multiple
 */
export default function ChipSelect({
  label,
  hint,
  error,
  required,
  options = [],
  value,
  onChange,
  multiple = false,
  className = "",
}) {
  return (
    <FormField label={label} hint={hint} error={error} required={required} className={className}>
      <ChipGroup
        options={options}
        value={value}
        onChange={onChange}
        multiple={multiple}
      />
    </FormField>
  );
}
