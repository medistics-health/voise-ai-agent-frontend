import { AlertTriangle } from 'lucide-react'
import AppModal from './AppModal'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  confirmDisabled?: boolean
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  return (
    <AppModal title={title} subtitle="Please review this action before continuing." onClose={onClose} maxWidthClassName="max-w-lg">
      <div className="space-y-5 p-6">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700">Delete confirmation</p>
              <p className="mt-1 text-sm text-red-600">{message}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmDisabled ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </AppModal>
  )
}
