import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import PageHeader from "../components/PageHeader";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Phone, FileText, Calendar, Clock } from "lucide-react";
interface Job {
  id: string;
  filename: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  totalCount: number;
  completedCount: number;
  eligibleCount: number;
  notEligibleCount: number;
  errorCount: number;
  createdAt: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="glass-card p-6 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
      >
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{label}</p>
        <p className="text-3xl font-bold text-slate-900 mt-0.5">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [callStats, setCallStats] = useState<any>(null);

  const fetchJobs = async () => {
    try {
      const res = await api.get("/eligibility/jobs");
      setJobs(res.data.data ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);
  useEffect(() => {
    const fetchCallStats = async () => {
      try {
        const res = await api.get("/calls/stats");
        setCallStats(res.data.data);
      } catch {}
    };
    fetchCallStats();
  }, []);
  const totals = jobs.reduce(
    (acc, j) => ({
      checks: acc.checks + j.totalCount,
      eligible: acc.eligible + (j.eligibleCount ?? 0),
      notEligible: acc.notEligible + (j.notEligibleCount ?? 0),
      errors: acc.errors + (j.errorCount ?? 0),
    }),
    { checks: 0, eligible: 0, notEligible: 0, errors: 0 },
  );

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of eligibility checks across all jobs."
        icon={ClipboardList}
        action={
          <button
            onClick={() => {
              setLoading(true);
              fetchJobs();
            }}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Checks"
          value={totals.checks}
          icon={ClipboardList}
          color="bg-brand-500"
        />
        <StatCard
          label="Eligible"
          value={totals.eligible}
          icon={CheckCircle2}
          color="bg-emerald-600"
        />
        <StatCard
          label="Not Eligible"
          value={totals.notEligible}
          icon={XCircle}
          color="bg-rose-600"
        />
        <StatCard
          label="Errors"
          value={totals.errors}
          icon={AlertTriangle}
          color="bg-amber-600"
        />
      </div>
      {callStats && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-ink-950 flex items-center gap-2">
            <Phone size={16} className="text-brand-600" />
            Voice AI Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-brand-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Phone size={14} className="text-brand-600" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Total Calls
                </span>
              </div>
              <p className="text-2xl font-bold text-ink-950">
                {callStats.totalCalls}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-brand-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-blue-600" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Today
                </span>
              </div>
              <p className="text-2xl font-bold text-ink-950">
                {callStats.todayCalls}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-brand-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Phone size={14} className="text-green-600" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Active
                </span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {callStats.activeCalls}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-brand-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-amber-600" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Pending Review
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {callStats.pendingReviews}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-brand-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-slate-600" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Avg Duration
                </span>
              </div>
              <p className="text-2xl font-bold text-ink-950">
                {callStats.avgDuration
                  ? `${Math.floor(callStats.avgDuration / 60)}:${(callStats.avgDuration % 60).toString().padStart(2, "0")}`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Recent Jobs */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Recent Jobs</h2>
          <Link
            to="/results"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">
              No jobs yet. Upload a CSV to get started.
            </p>
            <Link
              to="/upload"
              className="btn-primary mt-4 inline-flex items-center gap-2 text-sm shadow-md shadow-brand-500/20"
            >
              Upload CSV
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left font-semibold">File</th>
                  <th className="px-4 py-2.5 text-left font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    Total
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    Eligible
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    Not Eligible
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    Errors
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 border-t border-slate-100">
                {jobs.slice(0, 8).map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-2 text-slate-900 font-semibold max-w-[200px] truncate text-xs">
                      {job.filename}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={job.status as never} />
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600 font-semibold text-xs">
                      {job.totalCount}
                    </td>
                    <td className="px-4 py-2 text-right text-emerald-600 font-semibold text-xs">
                      {job.eligibleCount ?? 0}
                    </td>
                    <td className="px-4 py-2 text-right text-rose-600 font-semibold text-xs">
                      {job.notEligibleCount ?? 0}
                    </td>
                    <td className="px-4 py-2 text-right text-amber-600 font-semibold text-xs">
                      {job.errorCount ?? 0}
                    </td>
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap font-medium text-xs">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        to={`/results/${job.id}`}
                        className="text-brand-600 hover:text-brand-700 text-xs font-bold flex items-center gap-1 justify-end"
                      >
                        Details <ArrowRight size={12} />
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
  );
}
