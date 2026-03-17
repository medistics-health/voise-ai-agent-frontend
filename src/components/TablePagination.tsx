import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TablePaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export default function TablePagination({ page, totalPages, total, onPageChange }: TablePaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1)

  return (
    <div className="flex flex-col gap-3 border-t border-brand-100 bg-brand-50/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-medium text-slate-500">
        Page {Math.min(page, safeTotalPages)} of {safeTotalPages} · {total.toLocaleString()} total
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn-ghost inline-flex items-center gap-2 px-3"
        >
          <ChevronLeft size={14} />
          Prev
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= safeTotalPages}
          className="btn-ghost inline-flex items-center gap-2 px-3"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
