"use client"

export default function OptionsGrid({ options = [], selected = new Set(), onToggle = () => {}, cols = 4 }) {
  const responsiveCols =
    {
      3: "grid-cols-2 sm:grid-cols-3",
      4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
      5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    }[cols] || `grid-cols-${cols}`

  return (
    <div className={`grid gap-2 ${responsiveCols}`}>
      {options.map((option) => {
        const code = typeof option === "string" ? option : option.code
        const label = typeof option === "string" ? option : `${option.code} — ${option.label}`
        const active = selected.has(code)

        return (
          <button
            key={code}
            onClick={() => onToggle(code)}
            className={`px-3 py-2 border rounded-2xl text-sm transition whitespace-normal ${
              active ? "bg-primary text-white border-primary" : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
