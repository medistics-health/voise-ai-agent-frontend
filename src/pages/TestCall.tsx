import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  PhoneIncoming,
  Activity,
  Clock,
  Bot,
  User,
  Signal,
  Headphones,
  Loader2,
  Wifi,
  WifiOff,
  FlaskConical,
  Volume2,
  Shield,
  Tag,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useCall, type ActiveCall } from "../contexts/CallContext";

/* ── Helpers ── */
function fmtDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function stateBadgeColor(state: string) {
  switch (state) {
    case "greeting":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "identity_verification":
    case "identity_retry":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "main_menu":
      return "bg-green-50 text-green-700 border-green-200";
    case "scheduling_collect":
    case "scheduling_confirm":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "transfer_requested":
    case "transferring":
      return "bg-red-50 text-red-700 border-red-200";
    case "ending":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

/* ── Live duration hook ── */
function useLiveDuration(startTime: string) {
  const [dur, setDur] = useState(0);
  useEffect(() => {
    const start = new Date(startTime).getTime();
    const tick = () => setDur(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return dur;
}

/* ═══════════════════════════════════════════════
   Active Call Card
   ═══════════════════════════════════════════════ */
function ActiveCallCard({ call }: { call: ActiveCall }) {
  const navigate = useNavigate();
  const duration = useLiveDuration(call.startTime);
  const isTest = call.mode === "test";

  return (
    <div
      className="bg-white rounded-xl border border-brand-100 overflow-hidden
                    hover:shadow-md hover:shadow-brand-600/5 transition-all group"
    >
      {/* Top strip */}
      <div className={`h-1 ${isTest ? "bg-brand-400" : "bg-green-500"}`} />

      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                isTest
                  ? "bg-brand-100 text-brand-600"
                  : "bg-green-100 text-green-600"
              }`}
            >
              {isTest ? (
                <FlaskConical size={16} />
              ) : (
                <PhoneIncoming size={16} />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-ink-950">
                {isTest ? "Test Call" : call.callerNumber || "Unknown Caller"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                {call.roomName}
              </p>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-green-700 font-mono">
              {fmtDuration(duration)}
            </span>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${stateBadgeColor(call.state)}`}
          >
            {call.state.replace(/_/g, " ")}
          </span>

          {call.identityVerified && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md
                             bg-emerald-50 text-emerald-700 border border-emerald-200
                             flex items-center gap-1"
            >
              <Shield size={9} /> Verified
            </span>
          )}

          {call.intent && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md
                             bg-violet-50 text-violet-700 border border-violet-200
                             flex items-center gap-1"
            >
              <Tag size={9} /> {call.intent.replace(/_/g, " ")}
            </span>
          )}
        </div>

        {/* Patient name */}
        {call.patientName && (
          <div className="flex items-center gap-1.5">
            <User size={11} className="text-slate-400" />
            <span className="text-xs font-medium text-ink-950">
              {call.patientName}
            </span>
          </div>
        )}

        {/* Last transcript */}
        {call.lastTranscript && (
          <div
            className={`rounded-lg px-3 py-2 ${
              call.lastTranscript.speaker === "ai"
                ? "bg-slate-50 border border-slate-100"
                : "bg-brand-50 border border-brand-100"
            }`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              {call.lastTranscript.speaker === "ai" ? (
                <Bot size={9} className="text-slate-400" />
              ) : (
                <User size={9} className="text-brand-500" />
              )}
              <span className="text-[9px] font-semibold text-slate-400 uppercase">
                {call.lastTranscript.speaker === "ai" ? "Medistics AI" : "Caller"}
              </span>
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed line-clamp-2">
              "{call.lastTranscript.text}"
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-50">
          <span className="text-[10px] text-slate-400">
            {call.transcriptCount} messages
          </span>
          <button
            onClick={() => navigate(`/calls/${call.callSessionId}`)}
            className="text-[10px] font-semibold text-brand-600 hover:text-brand-700
                       hover:underline transition-colors"
          >
            View Details →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */
export default function TestCall() {
  const { activeCalls, sseConnected, status, startCall, openWidget } =
    useCall();

  const roomCalls = activeCalls.filter((c) => c.mode === "room");
  const testCalls = activeCalls.filter((c) => c.mode === "test");

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Voice Call Center"
        subtitle="Real-time monitoring of all active AI receptionist calls. Start a test call or watch incoming 3CX calls live."
        icon={Headphones}
      />

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total active */}
        <div className="bg-white rounded-xl border border-brand-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Active Calls
              </p>
              <p className="text-3xl font-black text-ink-950 mt-1">
                {activeCalls.length}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                activeCalls.length > 0
                  ? "bg-green-100 text-green-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <Activity size={22} />
            </div>
          </div>
          {activeCalls.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-600 font-medium">
                Live now
              </span>
            </div>
          )}
        </div>

        {/* 3CX Calls */}
        <div className="bg-white rounded-xl border border-brand-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                3CX Calls
              </p>
              <p className="text-3xl font-black text-ink-950 mt-1">
                {roomCalls.length}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                roomCalls.length > 0
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <PhoneIncoming size={22} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Incoming phone calls
          </p>
        </div>

        {/* Test Calls */}
        <div className="bg-white rounded-xl border border-brand-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Test Calls
              </p>
              <p className="text-3xl font-black text-ink-950 mt-1">
                {testCalls.length}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                testCalls.length > 0
                  ? "bg-brand-100 text-brand-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <FlaskConical size={22} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Browser test sessions
          </p>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-xl border border-brand-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Connection
              </p>
              <p className="text-sm font-bold mt-2">
                {sseConnected ? (
                  <span className="text-green-600 flex items-center gap-1.5">
                    <Wifi size={14} /> Connected
                  </span>
                ) : (
                  <span className="text-red-500 flex items-center gap-1.5">
                    <WifiOff size={14} /> Reconnecting...
                  </span>
                )}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                sseConnected
                  ? "bg-green-100 text-green-600"
                  : "bg-red-100 text-red-500"
              }`}
            >
              <Signal size={22} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Real-time event stream
          </p>
        </div>
      </div>

      {/* ── Start Test Call Button ── */}
      {status === "idle" && (
        <div className="flex justify-center">
          <button
            onClick={startCall}
            className="btn-primary inline-flex items-center gap-2 text-xs"
          >
            <Phone size={18} />
            Start Test Call
          </button>
        </div>
      )}

      {(status === "connected" || status === "connecting") && (
        <div className="flex justify-center">
          <button
            onClick={openWidget}
            className="flex items-center gap-2 bg-brand-50 hover:bg-brand-100
                       text-brand-700 px-6 py-2.5 rounded-full text-xs font-semibold
                       border border-brand-200 transition-colors"
          >
            <Bot size={14} />
            Open Call Widget
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </button>
        </div>
      )}

      {/* ── Active Calls Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-ink-950">Active Calls</h2>
            {activeCalls.length > 0 && (
              <span
                className="text-[10px] font-bold text-white bg-green-500
                               px-2 py-0.5 rounded-full animate-pulse"
              >
                {activeCalls.length} LIVE
              </span>
            )}
          </div>
          {!sseConnected && (
            <div className="flex items-center gap-1.5 text-amber-600">
              <Loader2 size={12} className="animate-spin" />
              <span className="text-[10px] font-medium">Reconnecting...</span>
            </div>
          )}
        </div>

        {activeCalls.length === 0 ? (
          <div className="bg-white rounded-xl border border-brand-100 p-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Phone size={24} className="text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  No active calls
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Incoming calls from 3CX and test calls will appear here in
                  real time. Start a test call to try the AI receptionist.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeCalls.map((call) => (
              <ActiveCallCard key={call.roomName} call={call} />
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Activity (optional section) ── */}
      <div className="bg-white rounded-xl border border-brand-100 p-5">
        <h3 className="text-xs font-bold text-ink-950 uppercase tracking-wider mb-3">
          System Info
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Bot size={14} className="text-brand-500" />
            <span className="text-slate-500">AI Agent:</span>
            <span className="font-semibold text-ink-950">Medistics AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Volume2 size={14} className="text-brand-500" />
            <span className="text-slate-500">TTS:</span>
            <span className="font-semibold text-ink-950">Deepgram Aura</span>
          </div>
          <div className="flex items-center gap-2">
            <Signal size={14} className="text-brand-500" />
            <span className="text-slate-500">STT:</span>
            <span className="font-semibold text-ink-950">Deepgram Nova-2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
