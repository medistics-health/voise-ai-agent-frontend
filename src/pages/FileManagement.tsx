import { useEffect, useState, useCallback, useRef, DragEvent } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api";
import toast from "react-hot-toast";
import StatusBadge from "../components/StatusBadge";
import PageHeader from "../components/PageHeader";
import {
  Upload as UploadIcon,
  FileText,
  X,
  CheckCircle2,
  Loader2,
  Download,
  ClipboardList,
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  ShieldCheck,
  FolderSync
} from "lucide-react";
import { Skeleton, TableSkeleton } from "../components/Skeleton";
import TablePagination from "../components/TablePagination";

interface Job {
  id: string
  filename: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  totalCount: number
  completedCount: number
  eligibleCount: number
  notEligibleCount: number
  errorCount: number
  queuedCount: number
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
  status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'ERROR' | 'PENDING' | 'RUNNING' | 'QUEUED'
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

function UploadSection() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Only CSV files are supported");
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/eligibility/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const jobId = res.data.data?.id;
      toast.success("Upload successful! Processing started.");
      navigate(jobId ? `/file-management/${jobId}` : "/file-management#results");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSample = () => {
    const header =
      "Patient First Name,Patient Last Name,Patient Middle Name,Patient DOB,Patient Gender,Patient email,patient Mobile Number,Patient Address Line 1,Patient Address Line 2,Patient City,Patient State,Patient Zip,Insurance Name,Member ID,Practice Location Name,Group Name,Providers\n";
    const row =
      "John,Doe,William,2001-12-01,Male,john@example.com,555-0100,123 Main St,Apt 4B,Dallas,TX,75001,Aetna,MEM123456,Garden State Medical Group- North Bergen,Virtual Care LLC,ANIL S PATEL MD\n";
    const blob = new Blob([header + row], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_patients.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const sizeKb = file ? (file.size / 1024).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <div className="glass-card p-5 bg-blue-50/50 border-blue-100">
        <p className="text-sm text-slate-700 leading-relaxed">
          <strong>Routing Rules:</strong> If `Insurance Name` is <strong>UnitedHealthcare</strong>, the patient is processed via direct UHC API call (both with and without Member ID). Non-UHC patients <strong>with a Member ID</strong> → added to <strong>Call Queue</strong> (status = Pending). Non-UHC patients <strong>without a Member ID</strong> → direct UHC API call. <strong>Status after API:</strong> Eligible, Ineligible, Error, or Unknown (never "Active"). <strong>Auto-Queue:</strong> Only patients with no coverage status move into the call queue.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer bg-white
          ${
            dragging
              ? "border-brand-400 bg-brand-50"
              : file
                ? "border-emerald-400 bg-emerald-50 cursor-default"
                : "border-slate-300 hover:border-brand-400 hover:bg-slate-50"
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        <div className="p-12 flex flex-col items-center text-center gap-4">
          {file ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-slate-900 font-bold">{file.name}</p>
                <p className="text-slate-500 text-sm mt-1 font-medium">
                  {sizeKb} KB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
              >
                <X size={14} /> Remove file
              </button>
            </>
          ) : (
            <>
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${dragging ? "bg-brand-100 border border-brand-200" : "bg-slate-100 border border-slate-200"}`}
              >
                <UploadIcon
                  size={28}
                  className={dragging ? "text-brand-600" : "text-slate-400"}
                />
              </div>
              <div>
                <p className="text-slate-900 font-bold">
                  {dragging
                    ? "Drop your file here"
                    : "Drag & drop your CSV here"}
                </p>
                <p className="text-slate-500 text-sm mt-1 font-medium">
                  or click to browse
                </p>
              </div>
              <p className="text-xs font-semibold text-slate-400">
                Max 500 rows · Max 5 MB
              </p>
            </>
          )}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!file || uploading}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
      >
        {uploading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Uploading & Processing...
          </>
        ) : (
          <>
            <UploadIcon size={18} />
            Upload &amp; Start Eligibility Check
          </>
        )}
      </button>

      <div className="glass-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileText size={16} className="text-brand-600" />
            Need a template?
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Download our sample CSV file to ensure your data includes patient
            address columns plus `Insurance Name`, `Member ID`,
            `Practice Location Name`, `Group Name`, and `Providers`.
          </p>
        </div>
        <button
          onClick={handleDownloadSample}
          className="btn-ghost flex items-center gap-2 whitespace-nowrap"
        >
          <Download size={16} className="text-slate-500" />
          Download Sample CSV
        </button>
      </div>
    </div>
  );
}

function JobListSection({ onNavigateUpload }: { onNavigateUpload: () => void }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 })

  const fetchJobs = async (page: number) => {
    setLoading(true)
    try {
      const res = await api.get('/eligibility/jobs', { params: { page, limit: 10 } })
      const body = res.data.data
      setJobs(body.jobs ?? [])
      setPagination(body.pagination ?? { total: 0, page: 1, limit: 10, totalPages: 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs(1)
  }, [])

  const onPageChange = (newPage: number) => {
    fetchJobs(newPage)
  }

  return (
    <div className="space-y-4 mt-2">
      <div className="flex justify-end">
        <button onClick={() => fetchJobs(pagination.page)} className="btn-ghost inline-flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh List
        </button>
      </div>
      <div className="table-shell">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={7} />
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-16 text-center">
            <ClipboardList size={40} className="text-brand-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No jobs yet.</p>
            <button onClick={onNavigateUpload} className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">Upload CSV</button>
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
                    <td className="px-4 py-2 text-right"><Link to={`/file-management/${job.id}`} className="text-brand-600 hover:text-brand-700 text-xs font-bold">View Details</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!loading && jobs.length > 0 && (
        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

function JobDetailSection({ jobId }: { jobId: string }) {
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
  const statuses = ['ALL', 'ELIGIBLE', 'QUEUED', 'NOT_ELIGIBLE', 'ERROR', 'PENDING', 'RUNNING']

  if (loading && !job) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="glass-card p-6">
          <TableSkeleton rows={10} cols={5} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link to="/file-management#results" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-ink-950 transition-colors">
        <ArrowLeft size={14} /> Back to Results
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
            <div className="rounded-2xl bg-brand-50 border border-brand-100 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Moved to Queue</p><p className="text-2xl font-bold text-brand-600 mt-1">{job.queuedCount ?? 0}</p></div>
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
                {status === 'ALL' ? `All (${checks.length})` : status === 'QUEUED' ? 'Moved to Queue' : status.replace('_', ' ')}
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

export default function FileManagement() {
  const { jobId } = useParams<{ jobId?: string }>()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<'upload' | 'results'>('upload')

  useEffect(() => {
    if (location.hash === '#results') {
      setActiveTab('results')
    } else {
      setActiveTab('upload')
    }
  }, [location.hash])

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="File Management"
        subtitle="Upload CSV files and manage eligibility results."
        icon={FolderSync}
      />
      
      {jobId ? (
        <JobDetailSection jobId={jobId} />
      ) : (
        <>
          <div className="flex space-x-1 bg-slate-100 p-1.5 rounded-xl w-max shadow-inner">
            <button 
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                activeTab === 'upload' 
                  ? 'bg-white text-brand-600 shadow-sm ring-1 ring-black/5' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <UploadIcon size={16} />
              Upload CSV
            </button>
            <button 
              onClick={() => setActiveTab('results')}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                activeTab === 'results' 
                  ? 'bg-white text-brand-600 shadow-sm ring-1 ring-black/5' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <ClipboardList size={16} />
              Results
            </button>
          </div>

          <div className="mt-6">
            {activeTab === 'upload' ? (
              <UploadSection />
            ) : (
              <JobListSection onNavigateUpload={() => setActiveTab('upload')} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
