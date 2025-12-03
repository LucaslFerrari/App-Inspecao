"use client"
import "../../styles/responsive.css"

export default function MatrixGrid({ items = [], onItemClick = () => {}, isActive = () => false, renderItem = null }) {
  return (
    <div className="matrix-grid">
      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={() => onItemClick(item)}
          className={`py-3 px-2 border rounded-2xl text-sm font-medium transition ${
            isActive(item) ? "bg-primary text-white border-primary" : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          {renderItem ? renderItem(item) : item}
        </button>
      ))}
    </div>
  )
}
