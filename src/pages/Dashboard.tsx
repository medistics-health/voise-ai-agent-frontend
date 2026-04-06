import { useEffect, useState, type ElementType } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ClipboardList,
  Database,
  HeartPulse,
  Phone,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Users,
  Waves,
} from "lucide-react";
import api from "../lib/api";
import PageHeader from "../components/PageHeader";

type ServiceState = "online" | "offline";

interface DashboardStats {
  totalCalls: number;
  todayCalls: number;
  activeCalls: number;
  pendingReviews: number;
  avgDuration: number;
  patientStats?: {
    totalPatients: number;
    unverifiedPatients: number;
    activePatients: number;
    unknownPatients: number;
    needsReviewPatients: number;
  };
  queueStats?: {
    activeQueues: number;
    pendingQueueItems: number;
    callingQueueItems: number;
    completedQueueItems: number;
  };
  coverageStats?: {
    totalCoverageRecords: number;
  };
  serviceStatus?: {
    backend?: { status: ServiceState };
    voiceAgent?: { status: ServiceState };
    livekit?: { status: ServiceState };
    deepgram?: { status: ServiceState };
    queueProcessor?: { running?: boolean };
  };
}

function MetricCard({
  label,
  value,
  accent,
  icon: Icon,
  helper,
}: {
  label: string;
  value: string | number;
  accent: string;
  icon: ElementType;
  helper: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-extrabold text-ink-950">{value}</p>
          <p className="mt-1.5 truncate text-[11px] text-slate-500">{helper}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}
        >
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function HealthPill({ label, state }: { label: string; state: ServiceState }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-brand-100 bg-white/80 px-3.5 py-2.5">
      <span className="text-sm font-semibold text-ink-950">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
          state === "online"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-rose-100 text-rose-700"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            state === "online" ? "bg-emerald-500" : "bg-rose-500"
          }`}
        />
        {state}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const statsRes = await api.get("/calls/stats");
      setStats(statsRes.data?.data ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const avgDuration = stats?.avgDuration
    ? `${Math.floor(stats.avgDuration / 60)}:${(stats.avgDuration % 60)
        .toString()
        .padStart(2, "0")}`
    : "0:00";

  const patientStats = stats?.patientStats;
  const queueStats = stats?.queueStats;
  const serviceStatus = stats?.serviceStatus;
  const backendState = serviceStatus?.backend?.status || "offline";
  const voiceState = serviceStatus?.voiceAgent?.status || "offline";
  const livekitState = serviceStatus?.livekit?.status || "offline";
  const deepgramState = serviceStatus?.deepgram?.status || "offline";
  const queueProcessorState = serviceStatus?.queueProcessor?.running
    ? "online"
    : "offline";

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Dashboard"
        subtitle="Live operations view across calls, coverage imports, patient verification, and queue activity."
        icon={ClipboardList}
        action={
          <button
            onClick={fetchDashboard}
            className="btn-ghost inline-flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />

      {/* Hero panel */}
      <section className="glass-card overflow-hidden p-5">
        <div className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700">
                System Health
              </p>
              <h2 className="mt-1.5 text-xl font-extrabold text-ink-950 sm:text-2xl">
                Call operations &amp; verification status
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Coverage records imported from CSV drive patient status first,
                then the queue picks up only unresolved patients. This board
                shows the live effect of that flow.
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              <HealthPill label="Backend API" state={backendState} />
              <HealthPill label="Voice Agent" state={voiceState} />
              <HealthPill label="LiveKit" state={livekitState} />
              <HealthPill label="Deepgram" state={deepgramState} />
              <HealthPill label="Queue Engine" state={queueProcessorState} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              label="Live Calls"
              value={stats?.activeCalls ?? 0}
              helper="Active AI sessions right now"
              icon={Phone}
              accent="bg-emerald-500"
            />
            <MetricCard
              label="Pending Reviews"
              value={stats?.pendingReviews ?? 0}
              helper="Call notes waiting on staff review"
              icon={ShieldCheck}
              accent="bg-amber-500"
            />
            <MetricCard
              label="Coverage Saved"
              value={stats?.coverageStats?.totalCoverageRecords ?? 0}
              helper="Imported and verified coverage records"
              icon={Database}
              accent="bg-sky-500"
            />
            <MetricCard
              label="Avg Duration"
              value={avgDuration}
              helper="Average completed call duration"
              icon={Waves}
              accent="bg-violet-500"
            />
          </div>
        </div>
      </section>

      {/* Patient stats row */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Patients"
          value={patientStats?.totalPatients ?? 0}
          helper="All patients stored in the platform"
          icon={Users}
          accent="bg-brand-500"
        />
        <MetricCard
          label="Unverified"
          value={patientStats?.unverifiedPatients ?? 0}
          helper="Still eligible for queue follow-up"
          icon={HeartPulse}
          accent="bg-slate-500"
        />
        <MetricCard
          label="Active Status"
          value={patientStats?.activePatients ?? 0}
          helper="Patients already marked active"
          icon={Stethoscope}
          accent="bg-emerald-500"
        />
        <MetricCard
          label="Needs Review"
          value={patientStats?.needsReviewPatients ?? 0}
          helper="Unknown, error, or no-answer records"
          icon={Activity}
          accent="bg-orange-500"
        />
      </section>

      {/* Bottom row */}
      <section className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        {/* Queue panel */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Queue Activity
              </p>
              <h3 className="mt-1 text-lg font-extrabold text-ink-950">
                Current verification workload
              </h3>
            </div>
            <Link
              to="/call-queue"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Open Queue <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricCard
              label="Active Queues"
              value={queueStats?.activeQueues ?? 0}
              helper="Queues currently processing"
              icon={ClipboardList}
              accent="bg-brand-500"
            />
            <MetricCard
              label="Pending Items"
              value={queueStats?.pendingQueueItems ?? 0}
              helper="Patients waiting to be called"
              icon={Users}
              accent="bg-sky-500"
            />
            <MetricCard
              label="Calling Now"
              value={queueStats?.callingQueueItems ?? 0}
              helper="Items currently in progress"
              icon={Phone}
              accent="bg-emerald-500"
            />
            <MetricCard
              label="Completed"
              value={queueStats?.completedQueueItems ?? 0}
              helper="Finished queue call attempts"
              icon={ShieldCheck}
              accent="bg-violet-500"
            />
          </div>
        </div>

        {/* Quick actions panel */}
        <div className="glass-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Quick Actions
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-ink-950">
            Jump into the next task
          </h3>

          <div className="mt-4 grid gap-2.5">
            {[
              {
                to: "/upload",
                label: "Upload New CSV",
                helper: "Import patients and coverage data",
              },
              {
                to: "/patients",
                label: "Review Patients",
                helper: "Check status, links, and patient actions",
              },
              {
                to: "/call-queue",
                label: "Create Queue",
                helper: "Start automated verification calls",
              },
              {
                to: "/results",
                label: "Open Results",
                helper: "Review saved coverage and job output",
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-center justify-between gap-4 rounded-xl border border-brand-100 bg-gradient-to-r from-white to-brand-50/40 px-4 py-3 transition-all hover:border-brand-300 hover:shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-ink-950">{item.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {item.helper}
                  </p>
                </div>
                <ArrowRight
                  size={14}
                  className="shrink-0 text-brand-600 transition group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
