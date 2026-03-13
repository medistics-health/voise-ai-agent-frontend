import { useEffect, useState, useCallback } from 'react'
import api from '../lib/api'
import { Users, Search, ChevronLeft, ChevronRight, User } from 'lucide-react'

interface Patient {
  id: string
  firstName: string
  lastName: string
  middleName?: string
  dob: string
  gender?: string
  email?: string
  mobileNumber?: string
  address?: string
  zipCode?: string
  payerName: string
  createdAt: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchPatients = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true)
    try {
      const res = await api.get('/patients', {
        params: { page, limit: 20, search: searchTerm },
      })
      setPatients(res.data.data.patients ?? [])
      setPagination(res.data.data.pagination)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPatients(1, search)
  }, [search, fetchPatients])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearch(inputValue), 350)
    return () => clearTimeout(timer)
  }, [inputValue])

  const goToPage = (page: number) => {
    fetchPatients(page, search)
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Patients</h1>
        <p className="page-subtitle">
          {pagination.total.toLocaleString()} patient{pagination.total !== 1 ? 's' : ''} in the system
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search patients..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : patients.length === 0 ? (
          <div className="p-16 text-center">
            <Users size={40} className="text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {search ? 'No patients match your search.' : 'No patients yet. Upload a CSV to add patients.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left">Patient Name</th>
                  <th className="px-6 py-3 text-left">Date of Birth</th>
                  <th className="px-6 py-3 text-left">Gender</th>
                  <th className="px-6 py-3 text-left">Contact Info</th>
                  <th className="px-6 py-3 text-left">Location</th>
                  <th className="px-6 py-3 text-left">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 border border-brand-100">
                          <User size={14} className="text-brand-600" />
                        </div>
                        <span className="font-medium text-slate-900">
                          {p.firstName} {p.middleName ? p.middleName + ' ' : ''}{p.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {p.dob ? new Date(p.dob).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {p.gender ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">
                      <div className="flex flex-col gap-0.5">
                        {p.email && <span>{p.email}</span>}
                        {p.mobileNumber && <span>{p.mobileNumber}</span>}
                        {(!p.email && !p.mobileNumber) && '—'}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs max-w-[200px] truncate">
                      {p.address ? `${p.address}${p.zipCode ? ', ' + p.zipCode : ''}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <p className="text-xs font-medium text-slate-500">
              Page {pagination.page} of {pagination.totalPages} &mdash; {pagination.total} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
