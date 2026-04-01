import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";

const AGENT_URL = "http://localhost:4100";

/* ── Types ── */
type CallStatus = "idle" | "connecting" | "connected" | "ended";
type SpeakingState = "idle" | "user" | "ai" | "processing";

export interface Message {
  id: string;
  speaker: "caller" | "ai" | "system";
  text: string;
  time: string;
}

export interface CallInfo {
  identityVerified: boolean;
  patientName: string | null;
  intent: string | null;
  state: string;
}

export interface ActiveCall {
  roomName: string;
  callSessionId: string;
  callerNumber: string | null;
  mode: "room" | "test";
  state: string;
  startTime: string;
  patientName: string | null;
  identityVerified: boolean;
  intent: string | null;
  lastTranscript: { speaker: string; text: string } | null;
  transcriptCount: number;
}

export interface PatientMetadata {
  name: string;
  patientId?: string;
  dob?: string;
  insuranceCompany?: string;
  insurancePhone?: string;
  providerNpi?: string;
}

export interface StartCallOptions {
  source?: "voice_center" | "patient_list";
  patientMeta?: PatientMetadata;
}

interface CallContextValue {
  activeCalls: ActiveCall[];
  sseConnected: boolean;
  status: CallStatus;
  messages: Message[];
  callInfo: CallInfo | null;
  callDuration: number;
  speakingState: SpeakingState;
  interimText: string;
  muted: boolean;
  micSupported: boolean;
  roomName: string;
  callSessionId: string;
  isWidgetOpen: boolean;
  isWidgetMinimized: boolean;
  patientMetadata: PatientMetadata | null;
  callSource: "voice_center" | "patient_list" | null;
  startCall: (options?: StartCallOptions) => Promise<void>;
  endCall: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  toggleMute: () => void;
  openWidget: () => void;
  closeWidget: () => void;
  toggleMinimize: () => void;
  resetCall: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function CallProvider({ children }: { children: ReactNode }) {
  /* ── SSE ── */
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [sseConnected, setSseConnected] = useState(false);

  /* ── Test-call state ── */
  const [status, setStatus] = useState<CallStatus>("idle");
  const [roomName, setRoomName] = useState("");
  const [callSessionId, setCallSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [speakingState, setSpeakingState] = useState<SpeakingState>("idle");
  const [muted, setMuted] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [micSupported] = useState(!!SpeechRecognition);
  const [callDuration, setCallDuration] = useState(0);

  /* ── Widget ── */
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [isWidgetMinimized, setIsWidgetMinimized] = useState(false);

  /* ── Call source & patient metadata ── */
  const [patientMetadata, setPatientMetadata] = useState<PatientMetadata | null>(null);
  const [callSource, setCallSource] = useState<"voice_center" | "patient_list" | null>(null);

  /* ── Refs ── */
  const roomNameRef = useRef("");
  const recognitionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const durationRef = useRef<any>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const statusRef = useRef(status);
  const mutedRef = useRef(muted);
  const autoCloseTimerRef = useRef<any>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  /* ═══════════════════════════════════════════
     Internal cleanup (called when call ends
     from ANY source — user click, backend, SSE)
     ═══════════════════════════════════════════ */
  const cleanupCallResources = useCallback(() => {
    // Stop TTS
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    speechSynthesis.cancel();

    // Stop mic + recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;

    // Stop duration timer
    if (durationRef.current) {
      clearInterval(durationRef.current);
      durationRef.current = null;
    }

    setSpeakingState("idle");
    setInterimText("");
  }, []);

  /* ═══════════════════════════════════════════
     SSE — handle backend events
     ═══════════════════════════════════════════ */
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: any = null;

    function connect() {
      es = new EventSource(`${AGENT_URL}/agent/events`);

      es.onopen = () => setSseConnected(true);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "init") {
            setActiveCalls(data.calls || []);
            return;
          }

          if (data.type === "call:started") {
            setActiveCalls((prev) => {
              if (prev.find((c) => c.roomName === data.roomName)) return prev;
              return [
                ...prev,
                {
                  roomName: data.roomName,
                  callSessionId: data.callSessionId,
                  callerNumber: data.data?.callerNumber || null,
                  mode: data.data?.mode || "room",
                  state: data.data?.state || "greeting",
                  startTime: data.timestamp,
                  patientName: null,
                  identityVerified: false,
                  intent: null,
                  lastTranscript: null,
                  transcriptCount: 0,
                },
              ];
            });
          }

          // ─── KEY FIX: detect when OUR test call ends on the backend ───
          if (data.type === "call:ended") {
            setActiveCalls((prev) =>
              prev.filter((c) => c.roomName !== data.roomName),
            );

            // If this is OUR current test call → end it on frontend too
            if (
              data.roomName === roomNameRef.current &&
              statusRef.current === "connected"
            ) {
              console.log("📡 SSE: Backend ended our call, updating frontend");
              cleanupCallResources();

              setStatus("ended");
              statusRef.current = "ended"; // ← ADD THIS

              setMessages((prev) => [
                ...prev,
                {
                  id: `${Date.now()}-system`,
                  speaker: "system",
                  text: "Call ended",
                  time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }),
                },
              ]);
              roomNameRef.current = "";
              toast.success("Call ended");
            }
          }

          if (data.type === "call:transcript") {
            setActiveCalls((prev) =>
              prev.map((c) =>
                c.roomName === data.roomName
                  ? {
                      ...c,
                      lastTranscript: {
                        speaker: data.data?.speaker || "ai",
                        text: data.data?.text || "",
                      },
                      state: data.data?.state || c.state,
                      patientName: data.data?.patientName || c.patientName,
                      identityVerified:
                        data.data?.identityVerified ?? c.identityVerified,
                      intent: data.data?.intent || c.intent,
                      transcriptCount: c.transcriptCount + 1,
                    }
                  : c,
              ),
            );
          }

          if (data.type === "call:state_changed") {
            setActiveCalls((prev) =>
              prev.map((c) =>
                c.roomName === data.roomName
                  ? {
                      ...c,
                      state: data.data?.newState || c.state,
                      patientName: data.data?.patientName || c.patientName,
                      identityVerified:
                        data.data?.identityVerified ?? c.identityVerified,
                      intent: data.data?.intent || c.intent,
                    }
                  : c,
              ),
            );

            // If our call is ending/transferring
            if (data.roomName === roomNameRef.current) {
              const newState = data.data?.newState;
              if (newState === "ending" || newState === "transferring") {
                setCallInfo((prev) =>
                  prev ? { ...prev, state: newState } : prev,
                );
              }
            }
          }
        } catch {
          /* ignore */
        }
      };

      es.onerror = () => {
        setSseConnected(false);
        es?.close();
        retryTimeout = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      es?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupCallResources]);

  /* ═══════════════════════════════════════════
     Auto-close widget 5 seconds after call ends
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    if (status === "ended" && isWidgetOpen) {
      autoCloseTimerRef.current = setTimeout(() => {
        setIsWidgetMinimized(false);
        // Don't auto-close, just leave it in "ended" state
        // User can close it manually or view details
      }, 500);
    }

    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, [status, isWidgetOpen]);

  /* ═══════════════════════════════════════════
     Helpers
     ═══════════════════════════════════════════ */
  const addMessage = useCallback(
    (speaker: "caller" | "ai" | "system", text: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          speaker,
          text,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        },
      ]);
    },
    [],
  );

  const startMic = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      return true;
    } catch {
      toast.error("Microphone access denied");
      return false;
    }
  };

  const startRecognition = useCallback(() => {
    if (!SpeechRecognition || mutedRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) {
        setInterimText(interim);
        setSpeakingState("user");
      }
      if (final.trim()) {
        setInterimText("");
        sendToAgent(final.trim());
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
    };

    recognition.onend = () => {
      if (
        statusRef.current === "connected" &&
        !mutedRef.current &&
        recognitionRef.current
      ) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Send to agent ── */
  const sendToAgent = async (text: string) => {
    if (!text.trim()) return;
    const currentRoom = roomNameRef.current;
    if (!currentRoom) return;

    // Don't send if call already ended
    if (statusRef.current !== "connected") return;

    addMessage("caller", text);
    setSpeakingState("processing");

    try {
      const res = await fetch(`${AGENT_URL}/agent/test-input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: currentRoom, text }),
      });
      const data = await res.json();

      if (data.success && data.response) {
        // Don't update if call ended while waiting for response
        if (statusRef.current !== "connected") return;

        if (data.response !== "(agent busy)") {
          addMessage("ai", data.response);
        }

        setCallInfo({
          identityVerified: data.context?.identityVerified || false,
          patientName: data.context?.patientName || null,
          intent: data.context?.intent || null,
          state: data.state || "unknown",
        });

        await playTTS(data.response);

        // Check if the conversation state means call should end
        if (data.state === "ending") {
          addMessage("system", "Call ending...");
          // Give a moment for the goodbye to play, then end
          setTimeout(() => {
            if (statusRef.current === "connected") {
              performEndCall();
            }
          }, 2000);
        } else if (data.state === "transferring") {
          addMessage("system", "Transferring call...");
          setTimeout(() => {
            if (statusRef.current === "connected") {
              performEndCall();
            }
          }, 2000);
        }
      }
    } catch (err: any) {
      addMessage("system", `Error: ${err.message}`);
    } finally {
      if (statusRef.current === "connected") {
        setSpeakingState("idle");
      }
    }
  };

  /* ── TTS ── */
  const playTTS = async (text: string): Promise<void> => {
    if (statusRef.current !== "connected") return;
    setSpeakingState("ai");
    try {
      const res = await fetch(`${AGENT_URL}/agent/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        return new Promise<void>((resolve) => {
          const audio = new Audio(url);
          ttsAudioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(url);
            ttsAudioRef.current = null;
            if (statusRef.current === "connected") setSpeakingState("idle");
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            ttsAudioRef.current = null;
            playBrowserTTS(text).then(resolve);
          };
          audio.play().catch(() => playBrowserTTS(text).then(resolve));
        });
      }
    } catch {
      /* fall through */
    }
    await playBrowserTTS(text);
  };

  const playBrowserTTS = (text: string): Promise<void> =>
    new Promise((resolve) => {
      if (!window.speechSynthesis) {
        setSpeakingState("idle");
        resolve();
        return;
      }
      if (recognitionRef.current)
        try {
          recognitionRef.current.stop();
        } catch {}
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 1.0;
      utt.pitch = 1.0;
      const voices = speechSynthesis.getVoices();
      const female = voices.find(
        (v) =>
          v.name.includes("Female") ||
          v.name.includes("Samantha") ||
          v.name.includes("Google US English"),
      );
      if (female) utt.voice = female;
      utt.onend = () => {
        if (statusRef.current === "connected") {
          setSpeakingState("idle");
          if (!mutedRef.current) startRecognition();
        }
        resolve();
      };
      utt.onerror = () => {
        setSpeakingState("idle");
        resolve();
      };
      speechSynthesis.speak(utt);
    });

  /* ═══════════════════════════════════════════
     performEndCall — internal end + backend stop
     ═══════════════════════════════════════════ */
  const performEndCall = useCallback(async () => {
    if (statusRef.current === "ended" || statusRef.current === "idle") return;

    const currentRoom = roomNameRef.current;
    cleanupCallResources();

    // ── Update BOTH ──
    setStatus("ended");
    statusRef.current = "ended"; // ← ADD THIS

    addMessage("system", "Call ended");

    if (currentRoom) {
      try {
        await fetch(`${AGENT_URL}/agent/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName: currentRoom }),
        });
      } catch {}
    }

    roomNameRef.current = "";
    toast.success("Call ended — check Call Log for details");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupCallResources, addMessage]);

  /* ═══════════════════════════════════════════
     Public Actions
     ═══════════════════════════════════════════ */
  /* ═══════════════════════════════════════════
   Public Actions
   ═══════════════════════════════════════════ */
  const startCall = async (options?: StartCallOptions) => {
    const source = options?.source || "voice_center";
    const patientMeta = options?.patientMeta || null;

    // ── Update BOTH state and ref immediately ──
    setStatus("connecting");
    statusRef.current = "connecting";

    setMessages([]);
    setCallInfo(null);
    setCallDuration(0);
    setMuted(false);
    setIsWidgetOpen(true);
    setIsWidgetMinimized(false);
    setPatientMetadata(patientMeta);
    setCallSource(source);

    const micOk = micSupported ? await startMic() : true;
    if (!micOk && micSupported) {
      setStatus("idle");
      statusRef.current = "idle";
      return;
    }

    try {
      const res = await fetch(`${AGENT_URL}/agent/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, patientMeta }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const newRoom = data.roomName;
      setRoomName(newRoom);
      setCallSessionId(data.callSessionId);
      roomNameRef.current = newRoom;

      // ── CRITICAL: Update ref BEFORE calling playTTS ──
      setStatus("connected");
      statusRef.current = "connected";

      setCallInfo({
        identityVerified: source === "patient_list",
        patientName: source === "patient_list" ? patientMeta?.name || null : null,
        intent: null,
        state: data.state,
      });

      durationRef.current = setInterval(
        () => setCallDuration((d) => d + 1),
        1000,
      );

      if (source === "patient_list") {
        // Patient-list calls: skip greeting, go directly to listening
        const patientName = patientMeta?.name || "the patient";
        addMessage("system", `Connected — ready for questions about ${patientName}`);
        if (micSupported) startRecognition();
        toast.success("Call connected!");
      } else {
        // Voice center calls: play full greeting
        const greeting =
          "Thank you for calling. My name is Medistics AI, your AI assistant. How can I help you today?";
        addMessage("ai", greeting);
        await playTTS(greeting);
        if (micSupported) startRecognition();
        toast.success("Call connected!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start");
      cleanupCallResources();
      setStatus("idle");
      statusRef.current = "idle";
    }
  };

  const endCall = async () => {
    await performEndCall();
  };

  const sendMessage = async (text: string) => {
    if (speakingState === "ai" || speakingState === "processing") return;
    if (statusRef.current !== "connected") return;
    await sendToAgent(text);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (next) {
      if (recognitionRef.current)
        try {
          recognitionRef.current.stop();
        } catch {}
      recognitionRef.current = null;
      setInterimText("");
    } else {
      startRecognition();
    }
  };

  const openWidget = () => {
    setIsWidgetOpen(true);
    setIsWidgetMinimized(false);
  };

  const closeWidget = () => {
    // If call is active, end it first
    if (status === "connected") {
      performEndCall().then(() => {
        setIsWidgetOpen(false);
      });
      return;
    }

    // If ended, reset and close
    setIsWidgetOpen(false);
    setIsWidgetMinimized(false);
    if (status === "ended") {
      resetCallState();
    }
  };

  const toggleMinimize = () => setIsWidgetMinimized((p) => !p);

  const resetCallState = useCallback(() => {
    setMessages([]);
    setCallInfo(null);
    setRoomName("");
    setCallSessionId("");
    setCallDuration(0);
    setStatus("idle");
    statusRef.current = "idle";
    setSpeakingState("idle");
    setInterimText("");
    setMuted(false);
    setPatientMetadata(null);
    setCallSource(null);
    roomNameRef.current = "";
  }, []);

  const resetCall = () => {
    if (status === "connected") {
      performEndCall().then(resetCallState);
    } else {
      resetCallState();
    }
  };

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      cleanupCallResources();
    };
  }, [cleanupCallResources]);

  return (
    <CallContext.Provider
      value={{
        activeCalls,
        sseConnected,
        status,
        messages,
        callInfo,
        callDuration,
        speakingState,
        interimText,
        muted,
        micSupported,
        roomName,
        callSessionId,
        isWidgetOpen,
        isWidgetMinimized,
        patientMetadata,
        callSource,
        startCall,
        endCall,
        sendMessage,
        toggleMute,
        openWidget,
        closeWidget,
        toggleMinimize,
        resetCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
