import "../../styles/responsive.css"

export default function FormGrid({ children, cols = "auto", gap = "12px", className = "" }) {
  const gridClass =
    {
      auto: "form-grid",
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    }[cols] || "form-grid"

  return <div className={`grid gap-3 ${gridClass} ${className}`}>{children}</div>
}
