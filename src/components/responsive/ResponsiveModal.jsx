"use client"
import "../../styles/modals.css"

export default function ResponsiveModal({
  title = "",
  isOpen = false,
  onClose = () => {},
  children = null,
  footer = null,
  maxWidth = "max-w-2xl",
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <h3 className="font-semibold text-lg">{title}</h3>
            <button onClick={onClose} className="modal-close" aria-label="Fechar">
              ✕
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
