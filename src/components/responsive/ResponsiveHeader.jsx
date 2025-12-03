"use client"
import "../../styles/responsive.css"

export default function ResponsiveHeader({ fields = [], onFieldChange = () => {}, rightContent = null }) {
  return (
    <div className="card p-responsive shadow-soft rounded-3xl">
      <div className="header-responsive">
        {/* Left: Form fields */}
        <div className="form-grid">
          {fields.map((field) => (
            <div key={field.id} className="flex flex-col gap-1">
              {field.label && <label className="text-sm font-medium text-slate-600">{field.label}</label>}
              {field.type === "select" ? (
                <select
                  value={field.value}
                  onChange={(e) => onFieldChange(field.id, e.target.value)}
                  className="table-input"
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || "text"}
                  value={field.value}
                  onChange={(e) => onFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="table-input"
                />
              )}
            </div>
          ))}
        </div>

        {/* Right: Info card */}
        {rightContent && <div className="card p-4 md:p-5 rounded-2xl ring-1 ring-slate-200">{rightContent}</div>}
      </div>
    </div>
  )
}
