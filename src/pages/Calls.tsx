import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";
import {
  Phone,
  Search,
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  BarChart3,
  Volume2
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import TablePagination from "../components/TablePagination";
import { TableSkeleton } from "../components/Skeleton";

interface CallSession {
  id: string;
  roomName: string;
  callerNumber: string | null;
  callerName: string | null;
  status: "active" | "completed" | "transferred" | "failed" | "missed";
  intent: string | null;
  identityVerified: boolean;
  duration: number | null;
  startedAt: string;
  endedAt: string | null;
  recordingUrl: string | null;
  metadata?: {
    insuranceCompany?: string;
    insurancePhone?: string;
    patientName?: string;
  } | null;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  note?: {
    id: string;
    status: string;
    source: string;
  } | null;
}

interface CallStats {
  totalCalls: number;
  todayCalls: number;
  activeCalls: number;
  pendingReviews: number;
  avgDuration: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  active: {
    label: "Active",
    color: "bg-green-100 text-green-700",
    icon: PhoneCall,
  },
  completed: {
    label: "Completed",
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle,
  },
  transferred: {
    label: "Transferred",
    color: "bg-amber-100 text-amber-700",
    icon: PhoneForwarded,
  },
  failed: { label: "Failed", color: "bg-red-100 text-red-700", icon: XCircle },
  missed: {
    label: "Missed",
    color: "bg-slate-100 text-slate-600",
    icon: PhoneOff,
  },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function Calls() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [filters] = useState({
    practiceLocationId: "",
    groupId: "",
    providerId: "",
  });

  const fetchCalls = useCallback(
    async (
      page: number,
      currentSearch: string,
      currentStatusFilter: string,
    ) => {
      try {
        const response = await api.get(`/calls`, {
          params: {
            page,
            search: currentSearch || undefined,
            status:
              currentStatusFilter === "all" ? undefined : currentStatusFilter,
            practiceLocationId: filters.practiceLocationId || undefined,
            groupId: filters.groupId || undefined,
            providerId: filters.providerId || undefined,
          },
        });

        // ✅ FIX: handle both { data: { calls, pagination } } and { calls, pagination }
        const body = response.data?.data ?? response.data;
        setCalls(body?.calls ?? []);
        setPagination(
          body?.pagination ?? {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
          },
        );
      } catch {
        toast.error("Failed to fetch calls.");
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/calls/stats");
      // ✅ FIX: safely unwrap
      const body = res.data?.data ?? res.data;
      setStats(body ?? null);
    } catch {
      // stats are optional
    }
  }, []);

  useEffect(() => {
    fetchCalls(1, search, statusFilter);
    fetchStats();
  }, [search, statusFilter, fetchCalls, fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(inputValue), 350);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Auto-refresh every 15 seconds for active calls
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCalls(pagination.page, search, statusFilter);
      fetchStats();
    }, 15000);
    return () => clearInterval(interval);
  }, [pagination.page, search, statusFilter, fetchCalls, fetchStats]);

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    fetchCalls(page, search, statusFilter);
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Call Log"
        subtitle="Monitor AI receptionist calls, transcripts, and generated notes."
        icon={Phone}
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            {
              label: "Total Calls",
              value: stats.totalCalls,
              icon: Phone,
              color: "text-brand-600",
            },
            {
              label: "Today",
              value: stats.todayCalls,
              icon: BarChart3,
              color: "text-blue-600",
            },
            {
              label: "Active Now",
              value: stats.activeCalls,
              icon: PhoneCall,
              color: "text-green-600",
            },
            {
              label: "Pending Review",
              value: stats.pendingReviews,
              icon: Clock,
              color: "text-amber-600",
            },
            {
              label: "Avg Duration",
              value: formatDuration(stats.avgDuration),
              icon: Clock,
              color: "text-slate-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-brand-100 p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                <stat.icon size={18} className={stat.color} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-lg font-bold text-ink-950">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="Search by caller number or name..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="transferred">Transferred</option>
          <option value="failed">Failed</option>
          <option value="missed">Missed</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-shell">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={10} cols={7} />
          </div>
        ) : calls.length === 0 ? (
          <div className="p-16 text-center">
            <Phone size={40} className="text-brand-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No calls found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">Caller</th>
                  <th className="px-4 py-2.5 text-left">Patient</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">Intent</th>
                  <th className="px-4 py-2.5 text-left">Verified</th>
                  <th className="px-4 py-2.5 text-left">Duration</th>
                  <th className="px-4 py-2.5 text-left">Time</th>
                  <th className="px-4 py-2.5 text-left">Note</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {calls.map((call) => {
                  const sc =
                    statusConfig[call.status] || statusConfig.completed;
                  const StatusIcon = sc.icon;
                  return (
                    <tr
                      key={call.id}
                      className="hover:bg-brand-50/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/calls/${call.id}`)}
                    >
                      <td className="px-4 py-2.5">
                        <div>
                          <p className="text-ink-950 font-semibold text-xs">
                            {call.metadata?.insuranceCompany ||
                              call.callerName ||
                              call.callerNumber ||
                              call.metadata?.insurancePhone ||
                              "Unknown"}
                          </p>
                          {(call.metadata?.insurancePhone || call.callerNumber) && 
                            (call.metadata?.insuranceCompany || call.callerName) && (
                            <p className="text-xs text-slate-500">
                              {call.metadata?.insurancePhone || call.callerNumber}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">
                        {call.patient
                          ? `${call.patient.firstName} ${call.patient.lastName}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}
                        >
                          <StatusIcon size={11} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 capitalize">
                        {call.intent?.replace(/_/g, " ") || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {call.identityVerified ? (
                          <CheckCircle size={14} className="text-green-600" />
                        ) : (
                          <XCircle size={14} className="text-slate-400" />
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 font-mono">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {formatTime(call.startedAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        {call.note ? (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              call.note.status === "approved"
                                ? "bg-green-100 text-green-700"
                                : call.note.status === "pending_review"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {call.note.status.replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                           {call.recordingUrl && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate(`/calls/${call.id}`); }} 
                              className="btn-ghost p-1.5 text-brand-600"
                              title="Listen to recording"
                            >
                              <Volume2 size={16} />
                            </button>
                          )}
                          <button className="btn-ghost px-2 py-1.5 text-xs inline-flex items-center gap-1">
                            View <ArrowRight size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={goToPage}
        />
      </div>
    </div>
  );
}
