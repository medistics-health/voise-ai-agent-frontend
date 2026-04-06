import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bot,
  FlaskConical,
  Headphones,
  Loader2,
  Phone,
  PhoneIncoming,
  Shield,
  Signal,
  Tag,
  User,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import QueueCallListening from "../components/QueueCallListening";
import { useCall, type ActiveCall } from "../contexts/CallContext";

const AGENT_URL = "http://localhost:4100";

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
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "transfer_requested":
    case "transferring":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "ending":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function useLiveDuration(startTime: string) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const tick = () => setDuration(Math.floor((Date.now() - start) / 1000));
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [startTime]);

  return duration;
}

function ActiveCallCard({
  call,
  stopping,
  onStop,
  onListen,
}: {
  call: ActiveCall;
  stopping: boolean;
  onStop: (roomName: string) => void;
  onListen: (call: ActiveCall) => void;
}) {
  const navigate = useNavigate();
  const duration = useLiveDuration(call.startTime);
  const isTest = call.mode === "test";
  const sourceLabel =
    call.source === "queue_system"
      ? "Queue"
      : call.source === "patient_list"
        ? "Patient"
        : call.source === "test_call"
          ? "Test"
          : "3CX";

  return (
    <div className="overflow-hidden rounded-xl border border-brand-100 bg-white transition-all hover:shadow-md hover:shadow-brand-600/5">
      <div className={`h-1 ${isTest ? "bg-brand-400" : "bg-emerald-500"}`} />

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                isTest
                  ? "bg-brand-100 text-brand-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}
            >
              {isTest ? <FlaskConical size={16} /> : <PhoneIncoming size={16} />}
            </div>
            <div>
              <p className="text-sm font-bold text-ink-950">
                {call.patientName ||
                  call.callerNumber ||
                  (isTest ? "Test Call" : "Unknown Caller")}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                {call.roomName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-[10px] font-bold text-green-700">
              {fmtDuration(duration)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${stateBadgeColor(call.state)}`}
          >
            {call.state.replace(/_/g, " ")}
          </span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {sourceLabel}
          </span>

          {call.identityVerified && (
            <span className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              <Shield size={9} /> Verified
            </span>
          )}

          {call.intent && (
            <span className="flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
              <Tag size={9} /> {call.intent.replace(/_/g, " ")}
            </span>
          )}
        </div>

        {call.patientName && (
          <div className="flex items-center gap-1.5">
            <User size={11} className="text-slate-400" />
            <span className="text-xs font-medium text-ink-950">
              {call.patientName}
            </span>
          </div>
        )}

        {call.lastTranscript && (
          <div
            className={`rounded-lg px-3 py-2 ${
              call.lastTranscript.speaker === "ai"
                ? "border border-slate-100 bg-slate-50"
                : "border border-brand-100 bg-brand-50"
            }`}
          >
            <div className="mb-0.5 flex items-center gap-1">
              {call.lastTranscript.speaker === "ai" ? (
                <Bot size={9} className="text-slate-400" />
              ) : (
                <User size={9} className="text-brand-500" />
              )}
              <span className="text-[9px] font-semibold uppercase text-slate-400">
                {call.lastTranscript.speaker === "ai" ? "Medistics AI" : "Caller"}
              </span>
            </div>
            <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-700">
              "{call.lastTranscript.text}"
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-50 pt-1">
          <span className="text-[10px] text-slate-400">
            {call.transcriptCount} messages
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onListen(call)}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-600 transition hover:bg-emerald-100"
              title="Listen to call audio"
            >
              Listen
            </button>
            <button
              onClick={() => onStop(call.roomName)}
              disabled={stopping}
              className="rounded-full border border-rose-200 px-3 py-1 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              {stopping ? "Stopping..." : "Stop"}
            </button>
            <button
              onClick={() => navigate(`/calls/${call.callSessionId}`)}
              className="text-[10px] font-semibold text-brand-600 transition-colors hover:text-brand-700 hover:underline"
            >
              View Details →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TestCall() {
  const {
    activeCalls,
    sseConnected,
    status,
    startCall,
    openWidget,
    endCall,
    roomName,
  } = useCall();
  const [stoppingRoom, setStoppingRoom] = useState<string | null>(null);
  const [listeningCall, setListeningCall] = useState<ActiveCall | null>(null);

  const roomCalls = activeCalls.filter((call) => call.mode === "room");
  const testCalls = activeCalls.filter((call) => call.mode === "test");

  const handleStopCall = async (targetRoomName: string) => {
    if (!targetRoomName) return;
    setStoppingRoom(targetRoomName);
    try {
      if (targetRoomName === roomName && status === "connected") {
        await endCall();
      } else {
        await fetch(`${AGENT_URL}/agent/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName: targetRoomName }),
        });
      }
    } finally {
      setStoppingRoom(null);
    }
  };

  return (
    <div className="space-y-6 p-8">
      <PageHeader
        title="Voice Call Center"
        subtitle="Real-time monitoring of all active AI receptionist calls. Start a test call, open the active widget, or stop any live call from here."
        icon={Headphones}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-brand-100 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Active Calls
              </p>
              <p className="mt-1 text-3xl font-black text-ink-950">
                {activeCalls.length}
              </p>
            </div>
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                activeCalls.length > 0
                  ? "bg-green-100 text-green-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <Activity size={22} />
            </div>
          </div>
          {activeCalls.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-medium text-green-600">
                Live now
              </span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-brand-100 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                3CX Calls
              </p>
              <p className="mt-1 text-3xl font-black text-ink-950">
                {roomCalls.length}
              </p>
            </div>
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                roomCalls.length > 0
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <PhoneIncoming size={22} />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">Incoming phone calls</p>
        </div>

        <div className="rounded-xl border border-brand-100 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Test Calls
              </p>
              <p className="mt-1 text-3xl font-black text-ink-950">
                {testCalls.length}
              </p>
            </div>
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                testCalls.length > 0
                  ? "bg-brand-100 text-brand-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <FlaskConical size={22} />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Browser test sessions
          </p>
        </div>

        <div className="rounded-xl border border-brand-100 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Connection
              </p>
              <p className="mt-2 text-sm font-bold">
                {sseConnected ? (
                  <span className="flex items-center gap-1.5 text-green-600">
                    <Wifi size={14} /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-red-500">
                    <WifiOff size={14} /> Reconnecting...
                  </span>
                )}
              </p>
            </div>
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                sseConnected
                  ? "bg-green-100 text-green-600"
                  : "bg-red-100 text-red-500"
              }`}
            >
              <Signal size={22} />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Real-time event stream
          </p>
        </div>
      </div>

      {status === "idle" && (
        <div className="flex justify-center">
          <button
            onClick={() => startCall()}
            className="btn-primary inline-flex items-center gap-2 text-xs"
          >
            <Phone size={18} />
            Start Test Call
          </button>
        </div>
      )}

      {(status === "connected" || status === "connecting") && (
        <div className="flex justify-center gap-3">
          <button
            onClick={openWidget}
            className="flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-6 py-2.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
          >
            <Bot size={14} />
            Open Call Widget
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </button>
          <button
            onClick={() => handleStopCall(roomName)}
            className="flex items-center gap-2 rounded-full border border-rose-200 bg-white px-6 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            <Phone size={14} />
            Stop Call
          </button>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-ink-950">Active Calls</h2>
            {activeCalls.length > 0 && (
              <span className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
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
          <div className="rounded-xl border border-brand-100 bg-white p-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Phone size={24} className="text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  No active calls
                </p>
                <p className="mt-1 max-w-sm text-xs text-slate-400">
                  Incoming calls from 3CX and test calls will appear here in real
                  time. Start a test call to try the AI receptionist.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeCalls.map((call) => (
              <ActiveCallCard
                key={call.roomName}
                call={call}
                stopping={stoppingRoom === call.roomName}
                onStop={handleStopCall}
                onListen={setListeningCall}
              />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-brand-100 bg-white p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-950">
          System Info
        </h3>
        <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
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

      {listeningCall && (
        <QueueCallListening
          queueItemId={listeningCall.callSessionId}
          patientName={listeningCall.patientName || "Unknown"}
          insuranceName={undefined}
          onClose={() => setListeningCall(null)}
        />
      )}
    </div>
  );
}
