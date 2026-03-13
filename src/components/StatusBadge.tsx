type Status = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'ERROR' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

const map: Record<Status, { label: string; className: string }> = {
  ELIGIBLE: { label: 'Eligible', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  NOT_ELIGIBLE: { label: 'Not Eligible', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  FAILED: { label: 'Failed', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  ERROR: { label: 'Error', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  PENDING: { label: 'Pending', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  RUNNING: { label: 'Checking…', className: 'bg-brand-50 text-brand-700 border-brand-200' },
}

export default function StatusBadge({ status }: { status: Status | string }) {
  const { label, className } = map[status as Status] ?? map.ERROR
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${className}`}>
      {status === 'RUNNING' && (
        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mr-1.5 animate-pulse" />
      )}
      {label}
    </span>
  )
}
