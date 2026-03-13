import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import {
  ClipboardList,
  ArrowLeft,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react'

interface Job {
  id: string
  filename: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  totalCount: number
  completedCount: number
  eligibleCount: number
  notEligibleCount: number
  errorCount: number
  createdAt: string
}

interface Check {
  id: string
  status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'ERROR' | 'PENDING' | 'RUNNING'
  payerStatus?: string
  planName?: string
  memberId?: string
  subscriberId?: string
  groupName?: string
  groupNumber?: string
  mbi?: string
  policyNumber?: string
  benefitPeriodStart?: string
  benefitPeriodEnd?: string
  errorMessage?: string
  rawResponse?: Record<string, unknown>
  patient?: {
    id: string
    firstName: string
    lastName: string
    middleName?: string
    dob: string
    email?: string
    mobileNumber?: string
    payerName: string
  }
}

type SortKey = 'name' | 'status'

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
      <div
        className="h-2 bg-brand-500 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* ── Job List (no jobId selected) ───────────────────────────── */
function JobList() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/eligibility/jobs').then((r) => {
      setJobs(r.data.data ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="page-title">Results</h1>
        <p className="page-subtitle">All eligibility jobs</p>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-16 text-center">
            <ClipboardList size={40} className="text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No jobs yet.</p>
            <Link to="/upload" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
              Upload CSV
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left">File</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Progress</th>
                  <th className="px-6 py-3 text-right">Eligible</th>
                  <th className="px-6 py-3 text-right">Not Eligible</th>
                  <th className="px-6 py-3 text-right">Errors</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-900 font-medium max-w-[200px] truncate">
                      {job.filename}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.status as never} />
                    </td>
                    <td className="px-6 py-4 min-w-[140px]">
                      <div className="space-y-1">
                        <ProgressBar done={job.completedCount} total={job.totalCount} />
                        <p className="text-xs font-medium text-slate-500">
                          {job.completedCount}/{job.totalCount}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-medium">{job.eligibleCount ?? 0}</td>
                    <td className="px-6 py-4 text-right text-rose-600 font-medium">{job.notEligibleCount ?? 0}</td>
                    <td className="px-6 py-4 text-right text-amber-600 font-medium">{job.errorCount ?? 0}</td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-xs font-medium">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/results/${job.id}`}
                        className="text-brand-600 hover:text-brand-700 text-xs font-bold"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Job Detail (jobId selected) ────────────────────────────── */
function JobDetail({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null)
  const [checks, setChecks] = useState<Check[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchDetail = useCallback(async () => {
    try {
      const res = await api.get(`/eligibility/jobs/${jobId}/results`)
      setJob(res.data.data.job)
      setChecks(res.data.data.checks ?? [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchDetail()
    pollingRef.current = setInterval(() => {
      fetchDetail()
    }, 5000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [fetchDetail])

  // Stop polling once completed
  useEffect(() => {
    if (job?.status === 'COMPLETED' || job?.status === 'FAILED') {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [job?.status])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  const filtered = checks.filter((c) =>
    statusFilter === 'ALL' ? true : c.status === statusFilter
  )

  const sorted = [...filtered].sort((a, b) => {
    let av = '', bv = ''
    if (sortKey === 'name') {
      av = `${a.patient?.lastName} ${a.patient?.firstName}`
      bv = `${b.patient?.lastName} ${b.patient?.firstName}`
    } else if (sortKey === 'status') {
      av = a.status; bv = b.status
    }
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const downloadCsv = () => {
    if (!checks.length) return
    const header = [
      'First Name', 'Last Name', 'Middle Name', 'DOB', 'Email', 'Mobile',
      'Status', 'Plan Name', 'Member ID', 'Subscriber ID', 'Group Name',
      'Group Number', 'MBI', 'Policy Number', 'Benefit Period Start', 'Benefit Period End', 'Error',
    ].join(',') + '\n'
    const rows = checks.map((c) =>
      [
        c.patient?.firstName ?? '',
        c.patient?.lastName ?? '',
        c.patient?.middleName ?? '',
        c.patient?.dob ?? '',
        c.patient?.email ?? '',
        c.patient?.mobileNumber ?? '',
        c.status,
        c.planName ?? '',
        c.memberId ?? '',
        c.subscriberId ?? '',
        c.groupName ?? '',
        c.groupNumber ?? '',
        c.mbi ?? '',
        c.policyNumber ?? '',
        c.benefitPeriodStart ?? '',
        c.benefitPeriodEnd ?? '',
        c.errorMessage ?? '',
      ]
        .map((v) => `"${v}"`)
        .join(',')
    )
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `results-${jobId.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />
    ) : null

  const statuses = ['ALL', 'ELIGIBLE', 'NOT_ELIGIBLE', 'ERROR', 'PENDING', 'RUNNING']

  if (loading && !job) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Back */}
      <Link
        to="/results"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={14} /> All Results
      </Link>

      {/* Job header */}
      {job && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="page-title">{job.filename}</h1>
              <p className="page-subtitle mt-1">
                Submitted {new Date(job.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={job.status as never} />
              {job.status === 'COMPLETED' && (
                <button onClick={downloadCsv} className="btn-ghost text-sm flex items-center gap-2">
                  <Download size={14} />
                  Export CSV
                </button>
              )}
              <button
                onClick={fetchDetail}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all border border-transparent hover:border-slate-200"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <ProgressBar done={job.completedCount} total={job.totalCount} />
          <div className="flex gap-6 text-sm font-medium">
            <span className="text-slate-600">{job.completedCount}/{job.totalCount} processed</span>
            <span className="text-emerald-600">{job.eligibleCount ?? 0} eligible</span>
            <span className="text-rose-600">{job.notEligibleCount ?? 0} not eligible</span>
            <span className="text-amber-600">{job.errorCount ?? 0} errors</span>
          </div>
        </div>
      )}

      {/* Filter + table */}
      <div className="glass-card overflow-hidden">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                  statusFilter === s
                    ? 'bg-brand-500 text-white border-brand-600'
                    : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                }`}
              >
                {s === 'ALL' ? `All (${checks.length})` : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-sm font-medium">No results match this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100 bg-slate-50/30">
                  <th
                    className="px-6 py-3 text-left cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => handleSort('name')}
                  >
                    <span className="inline-flex items-center gap-1">Patient <SortIcon k="name" /></span>
                  </th>
                  <th className="px-6 py-3 text-left">DOB</th>
                  <th
                    className="px-6 py-3 text-left cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <span className="inline-flex items-center gap-1">Status <SortIcon k="status" /></span>
                  </th>
                  <th className="px-6 py-3 text-left">Plan Name</th>
                  <th className="px-6 py-3 text-left">Member ID</th>
                  <th className="px-6 py-3 text-left">Subscriber ID</th>
                  <th className="px-6 py-3 text-left">Group Name</th>
                  <th className="px-6 py-3 text-left">Group Number</th>
                  <th className="px-6 py-3 text-left">MBI</th>
                  <th className="px-6 py-3 text-left">Policy Number</th>
                  <th className="px-6 py-3 text-left">Benefit Period</th>
                  <th className="px-6 py-3 text-left">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((check) => (
                  <tr key={check.id} className="hover:bg-slate-50 transition-colors">
                    {/* Patient */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 border border-brand-100">
                          <User size={12} className="text-brand-600" />
                        </div>
                        <span className="text-slate-900 font-medium whitespace-nowrap">
                          {check.patient?.firstName}{' '}
                          {check.patient?.middleName ? check.patient.middleName + ' ' : ''}
                          {check.patient?.lastName}
                        </span>
                      </div>
                    </td>
                    {/* DOB */}
                    <td className="px-6 py-3 text-slate-500 text-xs font-medium whitespace-nowrap">
                      {check.patient?.dob ?? '—'}
                    </td>
                    {/* Status */}
                    <td className="px-6 py-3">
                      <StatusBadge status={check.status} />
                    </td>
                    {/* Plan Name */}
                    <td className="px-6 py-3 text-slate-700 text-xs font-medium max-w-[180px] truncate">
                      {check.planName ?? '—'}
                    </td>
                    {/* Member ID */}
                    <td className="px-6 py-3 text-slate-600 text-xs font-mono whitespace-nowrap">
                      {check.memberId ?? '—'}
                    </td>
                    {/* Subscriber ID */}
                    <td className="px-6 py-3 text-slate-600 text-xs font-mono max-w-[120px] truncate" title={check.subscriberId ?? ''}>
                      {check.subscriberId ?? '—'}
                    </td>
                    {/* Group Name */}
                    <td className="px-6 py-3 text-slate-700 text-xs font-medium whitespace-nowrap">
                      {check.groupName ?? '—'}
                    </td>
                    {/* Group Number */}
                    <td className="px-6 py-3 text-slate-600 text-xs font-mono whitespace-nowrap">
                      {check.groupNumber ?? '—'}
                    </td>
                    {/* MBI */}
                    <td className="px-6 py-3 text-slate-600 text-xs font-mono whitespace-nowrap">
                      {check.mbi ?? '—'}
                    </td>
                    {/* Policy Number */}
                    <td className="px-6 py-3 text-slate-600 text-xs font-mono whitespace-nowrap">
                      {check.policyNumber ?? '—'}
                    </td>
                    {/* Benefit Period */}
                    <td className="px-6 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {check.benefitPeriodStart && check.benefitPeriodEnd
                        ? `${check.benefitPeriodStart} → ${check.benefitPeriodEnd}`
                        : '—'}
                    </td>
                    {/* Note / Error */}
                    <td className="px-6 py-3 text-xs text-slate-500 max-w-[200px] truncate font-medium">
                      {check.errorMessage ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Smart Router ───────────────────────────────────────────── */
export default function Results() {
  const { jobId } = useParams<{ jobId?: string }>()
  return jobId ? <JobDetail jobId={jobId} /> : <JobList />
}
