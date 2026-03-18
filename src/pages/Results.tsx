import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import PageHeader from '../components/PageHeader'
import {
  ClipboardList,
  ArrowLeft,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  ShieldCheck,
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

interface Coverage {
  patientId?: string
  planName?: string
  memberId?: string
  subscriberId?: string
  groupName?: string
  groupNumber?: string
  mbi?: string
  policyNumber?: string
  benefitPeriodStart?: string
  benefitPeriodEnd?: string
}

interface Check {
  id: string
  patientId: string
  status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'ERROR' | 'PENDING' | 'RUNNING'
  importedPlanName?: string
  importedMemberId?: string
  payerStatus?: string
  patient?: {
    id: string
    firstName: string
    lastName: string
    middleName?: string
    dob: string
    gender?: string
    payerName: string
  }
  coverage?: Coverage
}

type SortKey = 'name' | 'status'

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="w-full h-2.5 bg-brand-100 rounded-full overflow-hidden">
      <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  )
}

function formatPatientName(check: Check) {
  return [check.patient?.firstName, check.patient?.middleName, check.patient?.lastName].filter(Boolean).join(' ')
}

function formatBenefitPeriod(coverage?: Coverage) {
  if (coverage?.benefitPeriodStart && coverage?.benefitPeriodEnd) {
    return `${coverage.benefitPeriodStart} -> ${coverage.benefitPeriodEnd}`
  }

  return ' - '
}

function getPlanName(check: Check) {
  return check.coverage?.planName ?? check.importedPlanName ?? ''
}

function getMemberId(check: Check) {
  return check.coverage?.memberId ?? check.importedMemberId ?? ''
}

function JobList() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/eligibility/jobs').then((r) => setJobs(r.data.data ?? [])).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Results"
        subtitle="All eligibility jobs."
        icon={ClipboardList}
      />

      <div className="table-shell">
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-16 text-center">
            <ClipboardList size={40} className="text-brand-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No jobs yet.</p>
            <Link to="/upload" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">Upload CSV</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">File</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">Progress</th>
                  <th className="px-4 py-2.5 text-right">Eligible</th>
                  <th className="px-4 py-2.5 text-right">Not Eligible</th>
                  <th className="px-4 py-2.5 text-right">Errors</th>
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-brand-50/50 transition-colors">
                    <td className="px-4 py-2 text-ink-950 font-semibold max-w-[220px] truncate">{job.filename}</td>
                    <td className="px-4 py-2"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-2 min-w-[180px]">
                      <div className="space-y-1">
                        <ProgressBar done={job.completedCount} total={job.totalCount} />
                        <p className="text-xs font-semibold text-slate-500 text-xs">{job.completedCount}/{job.totalCount}</p>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-success-600 font-semibold text-xs">{job.eligibleCount ?? 0}</td>
                    <td className="px-4 py-2 text-right text-red-600 font-semibold text-xs">{job.notEligibleCount ?? 0}</td>
                    <td className="px-4 py-2 text-right text-amber-600 font-semibold text-xs">{job.errorCount ?? 0}</td>
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap text-xs font-semibold">{new Date(job.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-right"><Link to={`/results/${job.id}`} className="text-brand-600 hover:text-brand-700 text-xs font-bold">View</Link></td>
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
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchDetail()
    pollingRef.current = setInterval(fetchDetail, 5000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [fetchDetail])

  useEffect(() => {
    if ((job?.status === 'COMPLETED' || job?.status === 'FAILED') && pollingRef.current) {
      clearInterval(pollingRef.current)
    }
  }, [job?.status])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc((current) => !current)
      return
    }
    setSortKey(key)
    setSortAsc(true)
  }

  const filteredChecks = checks.filter((check) => (statusFilter === 'ALL' ? true : check.status === statusFilter))
  const sortedChecks = [...filteredChecks].sort((a, b) => {
    const valueA = sortKey === 'name' ? formatPatientName(a) : a.status
    const valueB = sortKey === 'name' ? formatPatientName(b) : b.status
    return sortAsc ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA)
  })

  const downloadCsv = () => {
    if (!checks.length) return
    const header = [
      'Patient ID', 'First Name', 'Last Name', 'Middle Name', 'DOB', 'Gender', 'Status', 'Payer Status',
      'Plan Name', 'Member ID', 'Subscriber ID', 'Group Name', 'Group Number', 'MBI', 'Policy Number',
      'Benefit Period Start', 'Benefit Period End',
    ].join(',') + '\n'

    const rows = checks.map((check) => [
      check.patientId,
      check.patient?.firstName ?? '',
      check.patient?.lastName ?? '',
      check.patient?.middleName ?? '',
      check.patient?.dob ?? '',
      check.patient?.gender ?? '',
      check.status,
      check.payerStatus ?? '',
      getPlanName(check),
      getMemberId(check),
      check.coverage?.subscriberId ?? '',
      check.coverage?.groupName ?? '',
      check.coverage?.groupNumber ?? '',
      check.coverage?.mbi ?? '',
      check.coverage?.policyNumber ?? '',
      check.coverage?.benefitPeriodStart ?? '',
      check.coverage?.benefitPeriodEnd ?? '',
    ].map((value) => `"${value}"`).join(','))

    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `results-${jobId.slice(0, 8)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = ({ k }: { k: SortKey }) => (sortKey === k ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null)
  const statuses = ['ALL', 'ELIGIBLE', 'NOT_ELIGIBLE', 'ERROR', 'PENDING', 'RUNNING']

  if (loading && !job) {
    return <div className="p-8 flex justify-center items-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="p-8 space-y-6">
      <Link to="/results" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-ink-950 transition-colors">
        <ArrowLeft size={14} /> All Results
      </Link>

      {job && (
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="page-title">{job.filename}</h1>
              <p className="page-subtitle mt-1">Submitted {new Date(job.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={job.status} />
              {job.status === 'COMPLETED' && <button onClick={downloadCsv} className="btn-ghost text-sm flex items-center gap-2"><Download size={14} />Export CSV</button>}
              <button onClick={fetchDetail} className="btn-ghost px-3"><RefreshCw size={14} /></button>
            </div>
          </div>

          <ProgressBar done={job.completedCount} total={job.totalCount} />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-brand-50 border border-brand-100 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Processed</p><p className="text-2xl font-bold text-ink-950 mt-1">{job.completedCount}/{job.totalCount}</p></div>
            <div className="rounded-2xl bg-success-100 border border-success-600/10 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Eligible</p><p className="text-2xl font-bold text-success-600 mt-1">{job.eligibleCount ?? 0}</p></div>
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Not Eligible</p><p className="text-2xl font-bold text-red-600 mt-1">{job.notEligibleCount ?? 0}</p></div>
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Errors</p><p className="text-2xl font-bold text-amber-600 mt-1">{job.errorCount ?? 0}</p></div>
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-100 bg-brand-50/70 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-full text-xs font-bold transition-all ${statusFilter === status ? 'bg-brand-500 text-white shadow-soft' : 'bg-white text-slate-600 hover:text-ink-950 border border-brand-100'}`}
              >
                {status === 'ALL' ? `All (${checks.length})` : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {sortedChecks.length === 0 ? (
          <div className="p-12 text-center"><p className="text-slate-500 text-sm font-medium">No results match this filter.</p></div>
        ) : (
          <>
            <div className="px-6 py-5 border-b border-brand-100 bg-white">
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-brand-600" />
                <div>
                  <h2 className="panel-title">Eligibility Results</h2>
                  <p className="page-subtitle mt-0">Patient status and payer response</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/40">
                    <th className="px-4 py-2.5 text-left cursor-pointer" onClick={() => handleSort('name')}><span className="inline-flex items-center gap-1">Patient <SortIcon k="name" /></span></th>
                    <th className="px-4 py-2.5 text-left">Patient ID</th>
                    <th className="px-4 py-2.5 text-left">DOB</th>
                    <th className="px-4 py-2.5 text-left">Gender</th>
                    <th className="px-4 py-2.5 text-left cursor-pointer" onClick={() => handleSort('status')}><span className="inline-flex items-center gap-1">Status <SortIcon k="status" /></span></th>
                    <th className="px-4 py-2.5 text-left">Payer Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  {sortedChecks.map((check) => (
                    <tr key={check.id} className="hover:bg-brand-50/40 transition-colors">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 flex-shrink-0 flex items-center justify-center border border-brand-100"><User size={12} className="text-brand-600" /></div>
                          <div className="min-w-0">
                            <p className="text-ink-950 font-semibold whitespace-nowrap text-xs">{formatPatientName(check)}</p>
                            <p className="text-xs text-slate-500 truncate">{check.patient?.payerName ?? 'UnitedHealthcare'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-slate-600 text-xs font-mono whitespace-nowrap">{check.patientId}</td>
                      <td className="px-4 py-2 text-slate-600 text-xs font-semibold whitespace-nowrap">{check.patient?.dob ?? ' - '}</td>
                      <td className="px-4 py-2 text-slate-600 text-xs font-semibold whitespace-nowrap">{check.patient?.gender ?? ' - '}</td>
                      <td className="px-4 py-2"><StatusBadge status={check.status} /></td>
                      <td className="px-4 py-2 text-slate-700 text-xs font-semibold whitespace-nowrap">{check.payerStatus ?? ' - '}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-5 border-y border-brand-100 bg-white">
              <div className="flex items-center gap-3">
                <ClipboardList size={18} className="text-brand-600" />
                <div>
                  <h2 className="panel-title">Coverage</h2>
                  <p className="page-subtitle mt-0">Shows saved coverage data or CSV-provided plan and member values</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/40">
                    <th className="px-4 py-2.5 text-left">Patient</th>
                    <th className="px-4 py-2.5 text-left">Patient ID</th>
                    <th className="px-4 py-2.5 text-left">Plan Name</th>
                    <th className="px-4 py-2.5 text-left">Member ID</th>
                    <th className="px-4 py-2.5 text-left">Subscriber ID</th>
                    <th className="px-4 py-2.5 text-left">Group Name</th>
                    <th className="px-4 py-2.5 text-left">Group Number</th>
                    <th className="px-4 py-2.5 text-left">MBI</th>
                    <th className="px-4 py-2.5 text-left">Policy Number</th>
                    <th className="px-4 py-2.5 text-left">Benefit Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  {sortedChecks.map((check) => (
                    <tr key={`${check.id}-coverage`} className="hover:bg-brand-50/40 transition-colors">
                      <td className="px-4 py-2 text-ink-950 font-semibold whitespace-nowrap text-xs">{formatPatientName(check)}</td>
                      <td className="px-4 py-2 text-slate-600 text-xs font-mono whitespace-nowrap">{check.coverage?.patientId ?? check.patientId}</td>
                      <td className="px-4 py-2 text-slate-700 text-xs font-semibold max-w-[220px] truncate">{getPlanName(check) || ' - '}</td>
                      <td className="px-4 py-2 text-slate-600 text-xs font-mono whitespace-nowrap">{getMemberId(check) || ' - '}</td>
                      <td className="px-4 py-2 text-slate-600 text-xs font-mono whitespace-nowrap">{check.coverage?.subscriberId ?? ' - '}</td>
                      <td className="px-4 py-2 text-slate-700 text-xs font-semibold whitespace-nowrap">{check.coverage?.groupName ?? ' - '}</td>
                      <td className="px-4 py-2 text-slate-600 text-xs font-mono whitespace-nowrap">{check.coverage?.groupNumber ?? ' - '}</td>
                      <td className="px-4 py-2 text-slate-600 text-xs font-mono whitespace-nowrap">{check.coverage?.mbi ?? ' - '}</td>
                      <td className="px-4 py-2 text-slate-600 text-xs font-mono whitespace-nowrap">{check.coverage?.policyNumber ?? ' - '}</td>
                      <td className="px-4 py-2 text-slate-500 text-xs whitespace-nowrap">{formatBenefitPeriod(check.coverage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Results() {
  const { jobId } = useParams<{ jobId?: string }>()
  return jobId ? <JobDetail jobId={jobId} /> : <JobList />
}
