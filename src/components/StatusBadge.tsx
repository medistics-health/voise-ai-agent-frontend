type Status = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'ERROR' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

const map: Record<Status, { label: string; className: string }> = {
  ELIGIBLE: { label: 'Eligible', className: 'bg-success-100 text-success-600 border-success-600/20' },
  COMPLETED: { label: 'Completed', className: 'bg-success-100 text-success-600 border-success-600/20' },
  NOT_ELIGIBLE: { label: 'Not Eligible', className: 'bg-red-50 text-red-700 border-red-200' },
  FAILED: { label: 'Failed', className: 'bg-red-50 text-red-700 border-red-200' },
  ERROR: { label: 'Error', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  PENDING: { label: 'Pending', className: 'bg-brand-50 text-brand-700 border-brand-200' },
  RUNNING: { label: 'Checking...', className: 'bg-brand-100 text-brand-700 border-brand-300' },
}

export default function StatusBadge({ status }: { status: Status | string }) {
  const { label, className } = map[status as Status] ?? map.ERROR

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${className}`}>
      {status === 'RUNNING' && (
        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mr-1.5 animate-pulse" />
      )}
      {label}
    </span>
  )
}
