import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";

const AGENT_URL = "http://localhost:4100";

type CallStatus = "idle" | "connecting" | "connected" | "ended";
type SpeakingState = "idle" | "user" | "ai" | "processing";
type CallSource = "test_call" | "voice_center" | "patient_list" | "queue_system";

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
  mode: "room" | "test" | "telnyx";
  source: CallSource;
  state: "dialing" | "ringing" | "connected" | string;
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
  queueItemId?: string;
  lookupData?: Record<string, unknown>;
}

export interface StartCallOptions {
  source?: CallSource;
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
  callSource: CallSource | null;
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
  if (!ctx) {
    throw new Error("useCall must be used within CallProvider");
  }
  return ctx;
}

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

function timeLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function CallProvider({ children }: { children: ReactNode }) {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
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
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [isWidgetMinimized, setIsWidgetMinimized] = useState(false);
  const [patientMetadata, setPatientMetadata] = useState<PatientMetadata | null>(null);
  const [callSource, setCallSource] = useState<CallSource | null>(null);

  const roomNameRef = useRef("");
  const recognitionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const durationRef = useRef<any>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const statusRef = useRef(status);
  const mutedRef = useRef(muted);
  const callSourceRef = useRef<CallSource | null>(null);
  const sendToAgentRef = useRef<(text: string) => Promise<void>>(async () => {});
  const autoCloseTimerRef = useRef<any>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    callSourceRef.current = callSource;
  }, [callSource]);

  const allowTemporaryControls = useCallback(
    (source?: CallSource | null) =>
      source === "test_call" || source === "patient_list",
    [],
  );

  const addMessage = useCallback(
    (speaker: "caller" | "ai" | "system", text: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          speaker,
          text,
          time: timeLabel(),
        },
      ]);
    },
    [],
  );

  const cleanupCallResources = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    speechSynthesis.cancel();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;

    if (durationRef.current) {
      clearInterval(durationRef.current);
      durationRef.current = null;
    }

    setSpeakingState("idle");
    setInterimText("");
  }, []);

  const startMic = useCallback(async (): Promise<boolean> => {
    // Text input mode - no microphone access needed
    return true;
  }, []);

  const startRecognition = useCallback(() => {
    // Using text input mode - Speech Recognition disabled for testing
    return;
  }, []);

  const playBrowserTTS = useCallback(
    (text: string): Promise<void> =>
      new Promise((resolve) => {
        if (!window.speechSynthesis) {
          setSpeakingState("idle");
          resolve();
          return;
        }

        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
        }

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (voice) =>
            voice.name.includes("Female") ||
            voice.name.includes("Samantha") ||
            voice.name.includes("Google US English"),
        );

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = () => {
          if (statusRef.current === "connected") {
            setSpeakingState("idle");
            if (
              !mutedRef.current &&
              allowTemporaryControls(callSourceRef.current)
            ) {
              startRecognition();
            }
          }
          resolve();
        };

        utterance.onerror = () => {
          setSpeakingState("idle");
          resolve();
        };

        speechSynthesis.speak(utterance);
      }),
    [allowTemporaryControls, startRecognition],
  );

  const playTTS = useCallback(
    async (text: string): Promise<void> => {
      if (statusRef.current !== "connected") return;

      setSpeakingState("ai");

      try {
        const response = await fetch(`${AGENT_URL}/agent/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);

          await new Promise<void>((resolve) => {
            const audio = new Audio(url);
            ttsAudioRef.current = audio;

            audio.onended = () => {
              URL.revokeObjectURL(url);
              ttsAudioRef.current = null;
              if (statusRef.current === "connected") {
                setSpeakingState("idle");
                if (
                  !mutedRef.current &&
                  allowTemporaryControls(callSourceRef.current)
                ) {
                  startRecognition();
                }
              }
              resolve();
            };

            audio.onerror = () => {
              URL.revokeObjectURL(url);
              ttsAudioRef.current = null;
              playBrowserTTS(text).then(resolve);
            };

            audio.play().catch(() => playBrowserTTS(text).then(resolve));
          });

          return;
        }
      } catch {
        // fall back to browser TTS
      }

      await playBrowserTTS(text);
    },
    [allowTemporaryControls, playBrowserTTS, startRecognition],
  );

  const performEndCall = useCallback(async () => {
    if (statusRef.current === "ended" || statusRef.current === "idle") return;

    const currentRoom = roomNameRef.current;
    cleanupCallResources();
    setStatus("ended");
    statusRef.current = "ended";
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
  }, [addMessage, cleanupCallResources]);

  const sendToAgent = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const currentRoom = roomNameRef.current;
      if (!currentRoom || statusRef.current !== "connected") return;

      addMessage("caller", text);
      setSpeakingState("processing");

      try {
        const response = await fetch(`${AGENT_URL}/agent/test-input`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName: currentRoom, text }),
        });
        const data = await response.json();

        if (data.success && data.response) {
          if (statusRef.current !== "connected") return;

          setCallInfo({
            identityVerified: data.context?.identityVerified || false,
            patientName: data.context?.patientName || null,
            intent: data.context?.intent || null,
            state: data.state || "unknown",
          });

          if (!sseConnected && data.response !== "(agent busy)") {
            addMessage("ai", data.response);
            await playTTS(data.response);
          }

          if (data.state === "ending") {
            addMessage("system", "Call ending...");
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
    },
    [addMessage, performEndCall, playTTS, sseConnected],
  );

  useEffect(() => {
    sendToAgentRef.current = sendToAgent;
  }, [sendToAgent]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: any = null;

    const connect = () => {
      eventSource = new EventSource(`${AGENT_URL}/agent/events`);

      eventSource.onopen = () => setSseConnected(true);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "init") {
            setActiveCalls(data.calls || []);
            return;
          }

          if (data.type === "call:started" || data.type === "call:dialing" || data.type === "call:ringing") {
            setActiveCalls((prev) => {
              const existing = prev.find((call) => call.roomName === data.roomName);
              const newState = data.data?.newState || data.data?.state || (data.type === "call:dialing" ? "dialing" : data.type === "call:ringing" ? "ringing" : "greeting");
              
              if (existing) {
                return prev.map(c => c.roomName === data.roomName ? { ...c, state: newState } : c);
              }

              return [
                ...prev,
                {
                  roomName: data.roomName,
                  callSessionId: data.callSessionId,
                  callerNumber: data.data?.callerNumber || null,
                  mode: data.data?.mode || "room",
                  source: data.data?.source || "voice_center",
                  state: newState,
                  startTime: data.timestamp,
                  patientName: data.data?.patientName || null,
                  identityVerified: data.data?.identityVerified || false,
                  intent: data.data?.intent || null,
                  lastTranscript: null,
                  transcriptCount: 0,
                },
              ];
            });
            return;
          }

          if (data.type === "call:audio") {
            const event = new CustomEvent(`call-audio-${data.roomName}`, {
              detail: data.data,
            });
            window.dispatchEvent(event);
            return;
          }

          if (data.type === "call:ended") {
            setActiveCalls((prev) =>
              prev.filter((call) => call.roomName !== data.roomName),
            );

            if (
              data.roomName === roomNameRef.current &&
              statusRef.current === "connected"
            ) {
              cleanupCallResources();
              setStatus("ended");
              statusRef.current = "ended";
              addMessage("system", "Call ended");
              roomNameRef.current = "";
            }
            return;
          }

          if (data.type === "call:transcript") {
            setActiveCalls((prev) =>
              prev.map((call) =>
                call.roomName === data.roomName
                  ? {
                      ...call,
                      source: data.data?.source || call.source,
                      lastTranscript: {
                        speaker: data.data?.speaker || "ai",
                        text: data.data?.text || "",
                      },
                      state: data.data?.state || call.state,
                      patientName: data.data?.patientName || call.patientName,
                      identityVerified:
                        data.data?.identityVerified ?? call.identityVerified,
                      intent: data.data?.intent || call.intent,
                      transcriptCount: call.transcriptCount + 1,
                    }
                  : call,
              ),
            );

            if (
              data.roomName === roomNameRef.current &&
              statusRef.current === "connected" &&
              data.data?.speaker === "ai" &&
              data.data?.text
            ) {
              const text = data.data.text as string;
              let shouldPlay = true;

              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.speaker === "ai" && last.text === text) {
                  shouldPlay = false;
                  return prev;
                }

                return [
                  ...prev,
                  {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    speaker: "ai",
                    text,
                    time: timeLabel(),
                  },
                ];
              });

              setCallInfo((prev) => ({
                identityVerified:
                  data.data?.identityVerified ?? prev?.identityVerified ?? false,
                patientName: data.data?.patientName || prev?.patientName || null,
                intent: data.data?.intent || prev?.intent || null,
                state: data.data?.state || prev?.state || "unknown",
              }));

              if (shouldPlay) {
                playTTS(text);
              }
            }

            return;
          }

          if (data.type === "call:state_changed") {
            setActiveCalls((prev) =>
              prev.map((call) =>
                call.roomName === data.roomName
                  ? {
                      ...call,
                      source: data.data?.source || call.source,
                      state: data.data?.newState || call.state,
                      patientName: data.data?.patientName || call.patientName,
                      identityVerified:
                        data.data?.identityVerified ?? call.identityVerified,
                      intent: data.data?.intent || call.intent,
                    }
                  : call,
              ),
            );

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
          // ignore malformed SSE payloads
        }
      };

      eventSource.onerror = () => {
        setSseConnected(false);
        eventSource?.close();
        retryTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [addMessage, cleanupCallResources, playTTS]);

  useEffect(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    if (status === "ended" && isWidgetOpen) {
      autoCloseTimerRef.current = setTimeout(() => {
        setIsWidgetMinimized(false);
      }, 500);
    }

    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [status, isWidgetOpen]);

  const startCall = useCallback(
    async (options?: StartCallOptions) => {
      const source = options?.source || "test_call";
      const patientMeta = options?.patientMeta || null;

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
      callSourceRef.current = source;

      const needsMic = allowTemporaryControls(source);
      const micOk = needsMic && micSupported ? await startMic() : true;
      if (!micOk && needsMic && micSupported) {
        setStatus("idle");
        statusRef.current = "idle";
        callSourceRef.current = null;
        return;
      }

      try {
        const response = await fetch(`${AGENT_URL}/agent/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source, patientMeta }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        setRoomName(data.roomName);
        setCallSessionId(data.callSessionId);
        roomNameRef.current = data.roomName;

        // Add a local placeholder for instant responsiveness
        setActiveCalls((prev) => [
          ...prev.filter(c => c.roomName !== data.roomName),
          {
            roomName: data.roomName,
            callSessionId: data.callSessionId,
            callerNumber: patientMeta?.insurancePhone || null,
            mode: source === 'test_call' ? 'test' : 'telnyx',
            source: source,
            state: 'connecting',
            startTime: new Date().toISOString(),
            patientName: patientMeta?.name || null,
            identityVerified: source === 'patient_list' || source === 'queue_system',
            intent: null,
            lastTranscript: null,
            transcriptCount: 0,
          }
        ]);

        setStatus("connected");
        statusRef.current = "connected";

        setCallInfo({
          identityVerified:
            source === "patient_list" || source === "queue_system",
          patientName:
            source === "patient_list" || source === "queue_system"
              ? patientMeta?.name || null
              : null,
          intent: null,
          state: data.state,
        });

        durationRef.current = setInterval(
          () => setCallDuration((duration) => duration + 1),
          1000,
        );

        addMessage(
          "system",
          source === "patient_list"
            ? "Connected. Temporary mic and text input are available for insurance-company testing."
            : "Connected.",
        );
        if (data.initialGreeting) {
          addMessage("ai", data.initialGreeting);
          await playTTS(data.initialGreeting);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to start");
        cleanupCallResources();
        setStatus("idle");
        statusRef.current = "idle";
        callSourceRef.current = null;
      }
    },
    [addMessage, allowTemporaryControls, cleanupCallResources, micSupported, playTTS, startMic],
  );

  const endCall = useCallback(async () => {
    await performEndCall();
  }, [performEndCall]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (speakingState === "ai" || speakingState === "processing") return;
      if (statusRef.current !== "connected") return;
      await sendToAgent(text);
    },
    [sendToAgent, speakingState],
  );

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);

    if (next) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      recognitionRef.current = null;
      setInterimText("");
      return;
    }

    startRecognition();
  }, [muted, startRecognition]);

  const openWidget = useCallback(() => {
    setIsWidgetOpen(true);
    setIsWidgetMinimized(false);
  }, []);

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
    callSourceRef.current = null;
    roomNameRef.current = "";
  }, []);

  const closeWidget = useCallback(() => {
    if (status === "connected") {
      performEndCall().then(() => {
        setIsWidgetOpen(false);
      });
      return;
    }

    setIsWidgetOpen(false);
    setIsWidgetMinimized(false);
    if (status === "ended") {
      resetCallState();
    }
  }, [performEndCall, resetCallState, status]);

  const toggleMinimize = useCallback(() => {
    setIsWidgetMinimized((prev) => !prev);
  }, []);

  const resetCall = useCallback(() => {
    if (status === "connected") {
      performEndCall().then(resetCallState);
      return;
    }

    resetCallState();
  }, [performEndCall, resetCallState, status]);

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
