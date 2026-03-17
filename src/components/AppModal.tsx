import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface AppModalProps {
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
  maxWidthClassName?: string
}

export default function AppModal({
  title,
  subtitle,
  children,
  onClose,
  maxWidthClassName = 'max-w-4xl',
}: AppModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal-card ${maxWidthClassName}`} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 border-b border-brand-100 px-6 py-5">
          <div>
            <h2 className="panel-title">{title}</h2>
            {subtitle && <p className="page-subtitle mt-0">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn-ghost px-2.5" aria-label="Close modal">
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
