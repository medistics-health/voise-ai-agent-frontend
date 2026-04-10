import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Bot,
  Headphones,
  Maximize2,
  Phone,
  PhoneIncoming,
  Shield,
  Signal,
  Tag,
  User,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useCall, type ActiveCall } from "../contexts/CallContext";
import { WavStreamPlayer } from "../lib/wavStreamPlayer";

const AGENT_URL = "http://localhost:4100";

function fmtDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function stateBadgeColor(state: string) {
  switch (state) {
    case "dialing":
    case "connecting":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "ringing":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "greeting":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "identity_verification":
    case "identity_retry":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "main_menu":
    case "insurance_verification":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
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

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-0.5 h-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          animate={active ? {
            height: ["20%", "100%", "40%", "80%", "20%"]
          } : { height: "20%" }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut"
          }}
          className="w-0.5 bg-brand-500 rounded-full"
        />
      ))}
    </div>
  );
}

function ActiveCallCard({
  call,
  stopping,
  onStop,
}: {
  call: ActiveCall;
  stopping: boolean;
  onStop: (roomName: string) => void;
}) {
  const navigate = useNavigate();
  const duration = useLiveDuration(call.startTime);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const audioPlayerRef = useRef<WavStreamPlayer | null>(null);
  const [isAudioActive, setIsAudioActive] = useState(false);

  // Audio Streaming Logic (Simplified for Card)
  useEffect(() => {
    if (!isSpeakerOn) {
      audioPlayerRef.current?.suspend().catch(() => {});
      return;
    }

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new WavStreamPlayer();
    }
    audioPlayerRef.current.resume().catch(() => {});

    const handleAudio = async (e: any) => {
      const data = e.detail;
      if (data?.audioBase64) {
        setIsAudioActive(true);
        setTimeout(() => setIsAudioActive(false), 1000);

        try {
          await audioPlayerRef.current?.enqueueBase64Wav(data.audioBase64);
        } catch (err: any) {
          console.warn("Audio playback issue:", err.message);
        }
      }
    };

    window.addEventListener(`call-audio-${call.roomName}`, handleAudio);
    return () => {
      window.removeEventListener(`call-audio-${call.roomName}`, handleAudio);
    };
  }, [isSpeakerOn, call.roomName]);

  useEffect(() => {
    return () => {
      audioPlayerRef.current?.close().catch(() => {});
      audioPlayerRef.current = null;
    };
  }, []);

  // Audio Context for ringing sound (synthetic)
  useEffect(() => {
    let oscillator: OscillatorNode | null = null;
    let gainNode: GainNode | null = null;
    let audioCtx: AudioContext | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    if (call.state === "ringing" || call.state === "dialing") {
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        gainNode = audioCtx.createGain();
        gainNode.connect(audioCtx.destination);
        gainNode.gain.value = 0; // Ensure muted start

        oscillator = audioCtx.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // 440 Hz
        oscillator.frequency.setValueAtTime(480, audioCtx.currentTime); // Dual tone approximation
        oscillator.connect(gainNode);
        oscillator.start();

        const playCadence = () => {
          if (!gainNode || !audioCtx) return;
          gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); // Volume
          gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 2); // 2s duration
        };

        playCadence();
        interval = setInterval(playCadence, 4000); // 2s on, 2s off cadence
      } catch (err) {
        console.warn("Could not play ringing sound", err);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
      if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
      }
      if (gainNode) gainNode.disconnect();
      if (audioCtx && audioCtx.state !== "closed") audioCtx.close().catch(console.warn);
    };
  }, [call.state]);

  const sourceLabel =
    call.source === "queue_system"
      ? "Queue"
      : call.source === "patient_list"
        ? "Outbound"
        : call.source === "telnyx_call"
          ? "Telnyx"
          : "Inbound";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition-all hover:shadow-xl hover:shadow-brand-500/10"
    >
      {/* Premium Header Gradient */}
      <div className={`h-1.5 w-full ${call.state === 'ringing' || call.state === 'dialing'
          ? "bg-gradient-to-r from-amber-400 to-orange-500"
          : "bg-gradient-to-r from-brand-500 to-emerald-500"
        }`} />

      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${call.state === 'ringing' ? "bg-amber-100 text-amber-600" : "bg-brand-50 text-brand-600"
              }`}>
              {call.state === 'ringing' ? (
                <motion.div
                  animate={{ rotate: [-10, 10, -10, 10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                >
                  <Phone size={20} />
                </motion.div>
              ) : (
                <PhoneIncoming size={20} />
              )}
              {isAudioActive && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-ink-950">
                  {call.patientName || call.callerNumber || "Unknown Caller"}
                </p>
                <span className="flex h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                  {sourceLabel}
                </span>
              </div>
              <p className="font-mono text-[9px] text-slate-400 mt-0.5">
                SID: {call.callSessionId.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-100">
              <div className={`h-1.5 w-1.5 rounded-full ${call.state === 'ending' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <span className="font-mono text-[11px] font-bold text-slate-700">
                {fmtDuration(duration)}
              </span>
            </div>
            {isSpeakerOn && <Waveform active={isAudioActive} />}
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <motion.span
            animate={call.state === 'ringing' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${stateBadgeColor(call.state)}`}
          >
            {call.state.replace(/_/g, " ")}
          </motion.span>

          {call.identityVerified && (
            <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
              <Shield size={10} fill="currentColor" className="opacity-20" /> Verified
            </span>
          )}

          {call.intent && (
            <span className="flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold text-violet-700">
              <Tag size={10} /> {call.intent.replace(/_/g, " ")}
            </span>
          )}
        </div>

        {/* Real-time Preview Area */}
        <AnimatePresence mode="wait">
          {call.lastTranscript ? (
            <motion.div
              key={call.lastTranscript.text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`rounded-xl p-3 border shadow-sm ${call.lastTranscript.speaker === "ai"
                  ? "bg-slate-50/50 border-slate-100"
                  : "bg-brand-50/50 border-brand-100"
                }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`h-5 w-5 rounded-md flex items-center justify-center ${call.lastTranscript.speaker === "ai" ? "bg-slate-200 text-slate-600" : "bg-brand-200 text-brand-700"
                    }`}>
                    {call.lastTranscript.speaker === "ai" ? <Bot size={12} /> : <User size={12} />}
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    {call.lastTranscript.speaker === "ai" ? "Medistics AI" : "Insurance Rep"}
                  </span>
                </div>
                <div className="flex gap-0.5">
                  <span className={`w-1 h-1 rounded-full bg-brand-300 ${isAudioActive ? 'animate-bounce' : ''}`} style={{ animationDelay: '0ms' }} />
                  <span className={`w-1 h-1 rounded-full bg-brand-300 ${isAudioActive ? 'animate-bounce' : ''}`} style={{ animationDelay: '150ms' }} />
                  <span className={`w-1 h-1 rounded-full bg-brand-300 ${isAudioActive ? 'animate-bounce' : ''}`} style={{ animationDelay: '300ms' }} />
                </div>
              </div>
              <p className="line-clamp-3 text-xs leading-relaxed text-slate-700 font-medium italic">
                "{call.lastTranscript.text}"
              </p>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center h-[72px] rounded-xl border border-dashed border-slate-200 bg-slate-50/30">
              <div className="text-center">
                <Signal size={16} className="mx-auto text-slate-300 mb-1" />
                <p className="text-[10px] font-medium text-slate-400">Waiting for audio...</p>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
            <Activity size={10} />
            {call.transcriptCount} BLOCKS
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`p-2 rounded-full border transition-all ${isSpeakerOn
                  ? "bg-brand-50 border-brand-200 text-brand-600 hover:bg-brand-100"
                  : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                }`}
              title={isSpeakerOn ? "Speaker On" : "Speaker Off"}
            >
              {isSpeakerOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>

            <button
              onClick={() => onStop(call.roomName)}
              disabled={stopping}
              className="px-4 py-1.5 rounded-full bg-rose-50 border border-rose-100 text-[10px] font-black text-rose-600 transition-all hover:bg-rose-100 hover:border-rose-200 disabled:opacity-50"
            >
              {stopping ? "STOPPING..." : "HANG UP"}
            </button>

            <button
              onClick={() => navigate(`/calls/${call.callSessionId}`)}
              className="p-2 rounded-full bg-slate-50 border border-slate-100 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
              title="Full Details"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ActiveCallCenter() {
  const {
    activeCalls,
    sseConnected,
    endCall,
    roomName,
    status,
  } = useCall();
  const [stoppingRoom, setStoppingRoom] = useState<string | null>(null);

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
    <div className="space-y-8 p-10 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Active Call Center"
          subtitle="Real-time surveillance of AI-driven insurance verifications."
          icon={Headphones}
        />

        <div className="flex items-center gap-4">
          {activeCalls.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-100"
            >
              <div className="relative h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              </div>
              <span className="text-xs font-black text-emerald-700"> {activeCalls.length} ACTIVE SESSIONS</span>
            </motion.div>
          )}

          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border ${sseConnected ? "bg-brand-50 border-brand-100 text-brand-700" : "bg-red-50 border-red-100 text-red-700"
            }`}>
            {sseConnected ? <Wifi size={14} /> : <WifiOff size={14} className="animate-pulse" />}
            <span className="text-xs font-black">{sseConnected ? "LIVE STREAM" : "RECONNECTING"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stats Summary Cards */}
        <div className="col-span-1 rounded-3xl p-6 bg-gradient-to-br from-indigo-600 to-brand-600 text-white shadow-xl shadow-brand-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
              <Signal size={20} />
            </div>
            <span className="text-[10px] font-black tracking-widest opacity-60">MONITOR</span>
          </div>
          <h3 className="text-3xl font-black mb-1">{activeCalls.length}</h3>
          <p className="text-xs font-medium opacity-80 uppercase tracking-tighter">Current Ongoing Calls</p>
        </div>

        <div className="col-span-1 border border-brand-100 bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <Zap size={20} />
            </div>
            <span className="text-[10px] font-black tracking-widest text-slate-400">LATENCY</span>
          </div>
          <h3 className="text-3xl font-black mb-1 text-ink-950">~120ms</h3>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-tighter">Avg Response Speed</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-lg font-black text-ink-950 flex items-center gap-2">
            Live Surveillance
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">LISTEN ONLY</span>
          </h2>
        </div>

        {activeCalls.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/20 p-20 text-center"
          >
            <div className="max-w-md mx-auto">
              <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center mx-auto mb-6 shadow-sm border border-brand-50">
                <Bot size={32} className="text-brand-300" />
              </div>
              <h3 className="text-xl font-black text-ink-950 mb-2">No Active Streams</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                We're ready and waiting. As soon as an insurance verification call begins via Telnyx or the Queue, it will appear here for real-time monitoring.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {activeCalls.map((call) => (
                <ActiveCallCard
                  key={call.roomName}
                  call={call}
                  stopping={stoppingRoom === call.roomName}
                  onStop={handleStopCall}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* System Status Section */}
      <div className="pt-10">
        <div className="rounded-3xl border border-brand-100 bg-white p-8">
          <div className="flex items-center gap-2 mb-6">
            <Signal size={16} className="text-brand-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-ink-950">Secure Communication Nodes</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">AI Processing</p>
              <div className="flex items-center gap-2 text-sm font-black text-ink-950">
                Anthropic Claude 3.5 Sonnet
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Voice Synthesis</p>
              <div className="flex items-center gap-2 text-sm font-black text-ink-950">
                Deepgram Aura Luna : Female : English (US)
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Audio Protocol</p>
              <div className="flex items-center gap-2 text-sm font-black text-ink-950">
                Telnyx Media Stream
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Encryption</p>
              <div className="flex items-center gap-2 text-sm font-black text-ink-950">
                TLS 1.3 Secure
                <Shield size={14} className="text-brand-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
