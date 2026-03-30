import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Send,
  Loader2,
  Bot,
  User,
  Volume2,
  Minimize2,
  Maximize2,
  X,
} from "lucide-react";
import { useCall } from "../contexts/CallContext";

export default function FloatingCallWidget() {
  const navigate = useNavigate();
  const {
    status,
    messages,
    callDuration,
    speakingState,
    interimText,
    muted,
    micSupported,
    callSessionId,
    isWidgetOpen,
    isWidgetMinimized,
    patientMetadata,
    callSource,
    startCall,
    endCall,
    sendMessage,
    toggleMute,
    closeWidget,
    toggleMinimize,
    resetCall,
  } = useCall();

  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Animate bars when AI speaks
  useEffect(() => {
    if (speakingState !== "ai" || !barsRef.current) return;
    const interval = setInterval(() => {
      if (!barsRef.current) return;
      const bars = barsRef.current.children;
      for (let i = 0; i < bars.length; i++) {
        (bars[i] as HTMLElement).style.height =
          `${Math.max(3, Math.random() * 28)}px`;
      }
    }, 130);
    return () => clearInterval(interval);
  }, [speakingState]);

  if (!isWidgetOpen) return null;

  const fmtDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText("");
  };

  const handleClose = () => {
    closeWidget(); // This now ends the call if connected
  };

  const handleEndAndClose = async () => {
    await endCall();
    // Small delay so user sees "ended" briefly
    setTimeout(() => {
      closeWidget();
    }, 500);
  };

  const isBusy = speakingState === "ai" || speakingState === "processing";

  /* ── Minimized pill ── */
  if (isWidgetMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <button
          onClick={toggleMinimize}
          className="flex items-center gap-2.5 bg-white border border-brand-200
                     rounded-full px-4 py-2.5 shadow-xl shadow-brand-600/10
                     hover:shadow-2xl hover:shadow-brand-600/15 transition-all
                     hover:scale-105 group"
        >
          <div className="relative">
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700
                            flex items-center justify-center"
            >
              <Bot size={16} className="text-white" />
            </div>
            {status === "connected" && (
              <div
                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full
                              bg-green-500 border-2 border-white animate-pulse"
              />
            )}
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-ink-950 leading-none">
              {callSource === "patient_list" && patientMetadata
                ? patientMetadata.name
                : status === "connected"
                  ? "In Call"
                  : status === "ended"
                    ? "Call Ended"
                    : "Ready"}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {fmtDuration(callDuration)}
            </p>
          </div>
          {status === "connected" && (
            <div className="flex items-end gap-[2px] h-4 ml-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-[3px] rounded-full transition-all duration-100 ${
                    speakingState === "ai"
                      ? "bg-violet-400 animate-pulse"
                      : speakingState === "user"
                        ? "bg-brand-400 animate-pulse"
                        : "bg-slate-300"
                  }`}
                  style={{ height: `${4 + Math.random() * 12}px` }}
                />
              ))}
            </div>
          )}
          <Maximize2
            size={12}
            className="text-slate-400 group-hover:text-brand-600 transition-colors ml-1"
          />
        </button>
      </div>
    );
  }

  /* ── Expanded widget ── */
  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] w-[400px] max-h-[620px]
                    flex flex-col bg-white rounded-2xl border border-brand-100
                    shadow-2xl shadow-black/10 overflow-hidden"
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-brand-100
                      bg-gradient-to-r from-brand-50 to-white flex-shrink-0"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                status === "connected"
                  ? "bg-gradient-to-br from-brand-500 to-brand-700"
                  : status === "ended"
                    ? "bg-slate-300"
                    : "bg-slate-200"
              }`}
            >
              <Bot
                size={14}
                className={
                  status === "connected" ? "text-white" : "text-slate-500"
                }
              />
            </div>
            {status === "connected" && (
              <div
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                              bg-green-500 border-2 border-white animate-pulse"
              />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-ink-950 leading-none">
              {callSource === "patient_list" && patientMetadata
                ? patientMetadata.name
                : "AI Receptionist"}
            </p>
            {callSource === "patient_list" && patientMetadata?.insuranceCompany && (
              <p className="text-[10px] text-brand-600 font-medium leading-none mt-0.5">
                {patientMetadata.insuranceCompany}
                {patientMetadata.insurancePhone ? ` · ${patientMetadata.insurancePhone}` : ""}
              </p>
            )}
            <p className="text-[10px] text-slate-500 mt-0.5">
              {status === "connected"
                ? `Connected · ${fmtDuration(callDuration)}`
                : status === "connecting"
                  ? "Connecting..."
                  : status === "ended"
                    ? `Ended · ${fmtDuration(callDuration)}`
                    : "Ready"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {status === "connected" && (
            <>
              <button
                onClick={toggleMute}
                className={`p-1.5 rounded-full transition-colors ${
                  muted
                    ? "bg-red-100 text-red-600 hover:bg-red-200"
                    : "bg-brand-50 text-brand-600 hover:bg-brand-100"
                }`}
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MicOff size={13} /> : <Mic size={13} />}
              </button>
              <button
                onClick={handleEndAndClose}
                className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full transition-colors"
                title="End call"
              >
                <PhoneOff size={13} />
              </button>
            </>
          )}

          {/* Minimize — only when connected */}
          {status === "connected" && (
            <button
              onClick={toggleMinimize}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Minimize"
            >
              <Minimize2 size={13} />
            </button>
          )}

          {/* Close/X — always visible */}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title={status === "connected" ? "End call & close" : "Close"}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Voice visualizer strip (only when connected) ── */}
      {status === "connected" && (
        <div className="px-4 py-2.5 border-b border-brand-50 bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                speakingState === "ai"
                  ? "bg-violet-100"
                  : speakingState === "user"
                    ? "bg-brand-100"
                    : speakingState === "processing"
                      ? "bg-amber-100"
                      : "bg-slate-100"
              }`}
            >
              {speakingState === "processing" ? (
                <Loader2 size={12} className="text-amber-600 animate-spin" />
              ) : speakingState === "ai" ? (
                <Volume2 size={12} className="text-violet-600" />
              ) : (
                <Mic
                  size={12}
                  className={
                    speakingState === "user"
                      ? "text-brand-600"
                      : "text-slate-400"
                  }
                />
              )}
            </div>

            <div ref={barsRef} className="flex items-end gap-[2px] h-6 flex-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-[4px] rounded-full transition-all duration-75 flex-1 max-w-[6px] ${
                    speakingState === "ai"
                      ? "bg-violet-300"
                      : speakingState === "user"
                        ? "bg-brand-300"
                        : "bg-slate-200"
                  }`}
                  style={{ height: "3px" }}
                />
              ))}
            </div>

            <span
              className={`text-[10px] font-semibold flex-shrink-0 ${
                speakingState === "ai"
                  ? "text-violet-600"
                  : speakingState === "user"
                    ? "text-brand-600"
                    : speakingState === "processing"
                      ? "text-amber-600"
                      : "text-slate-400"
              }`}
            >
              {speakingState === "ai"
                ? "Speaking"
                : speakingState === "user"
                  ? "Listening"
                  : speakingState === "processing"
                    ? "Thinking"
                    : muted
                      ? "Muted"
                      : "Ready"}
            </span>
          </div>

          {interimText && (
            <p className="text-[10px] text-brand-500 italic mt-1.5 truncate">
              "{interimText}"
            </p>
          )}
        </div>
      )}

      {/* ── Messages ── */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0"
        style={{ maxHeight: status === "connected" ? "320px" : "400px" }}
      >
        {/* Idle state */}
        {status === "idle" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div
              className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-100 to-brand-50
                            flex items-center justify-center border border-brand-200"
            >
              <Phone size={24} className="text-brand-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-ink-950">
                Start a Test Call
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Talk to the AI receptionist
              </p>
            </div>
            <button

              onClick={() => startCall()}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5
                         rounded-full text-sm font-bold flex items-center gap-2
                         transition-all hover:scale-105 shadow-lg shadow-green-600/25"
            >
              <Phone size={16} /> Start Call
            </button>
          </div>
        )}

        {/* Connecting */}
        {status === "connecting" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-brand-300 animate-ping opacity-30" />
              <div className="absolute inset-0 rounded-full bg-brand-50 flex items-center justify-center">
                <Loader2 size={24} className="text-brand-500 animate-spin" />
              </div>
            </div>
            <p className="text-xs text-brand-600 font-medium">
              Connecting to Med...
            </p>
          </div>
        )}

        {/* Messages */}
        {(status === "connected" || status === "ended") &&
          messages.map((msg) => {
            if (msg.speaker === "system") {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full">
                    {msg.text}
                  </span>
                </div>
              );
            }
            const isAI = msg.speaker === "ai";
            return (
              <div
                key={msg.id}
                className={`flex ${isAI ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 ${
                    isAI
                      ? "bg-slate-100 text-slate-800"
                      : "bg-brand-600 text-white"
                  }`}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    {isAI ? (
                      <Bot size={9} className="opacity-40" />
                    ) : (
                      <User size={9} className="opacity-40" />
                    )}
                    <span className="text-[9px] font-semibold opacity-40">
                      {isAI ? "Medistics AI" : "You"}
                    </span>
                    <span className="text-[8px] opacity-25 ml-auto">
                      {msg.time}
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed">{msg.text}</p>
                </div>
              </div>
            );
          })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input (only when connected) ── */}
      {status === "connected" && (
        <div className="p-3 border-t border-brand-100 flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder={
                micSupported
                  ? "Or type here..."
                  : "Type what the caller says..."
              }
              disabled={isBusy}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-brand-100
                         focus:border-brand-300 focus:ring-1 focus:ring-brand-200
                         outline-none transition-all disabled:opacity-50
                         placeholder:text-slate-400"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isBusy}
              className="bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300
                         text-white px-3 rounded-xl transition-colors"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Ended footer ── */}
      {status === "ended" && (
        <div className="p-3 border-t border-brand-100 flex-shrink-0 space-y-2">
          <div className="flex gap-2">
            {callSessionId && (
              <button
                onClick={() => {
                  resetCall();
                  closeWidget();
                  navigate(`/calls/${callSessionId}`);
                }}
                className="flex-1 text-xs text-brand-600 hover:text-brand-700 font-semibold
                           py-2.5 rounded-lg hover:bg-brand-50 transition-colors border border-brand-100"
              >
                View Call Details →
              </button>
            )}
            <button
              onClick={() => {
                resetCall();
                closeWidget();
              }}
              className="flex-1 text-xs text-slate-600 hover:text-slate-800 font-medium
                         py-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
            >
              Close
            </button>
          </div>
          <button
            onClick={() => {
              resetCall();
              startCall();
            }}
            className="w-full text-xs text-green-700 hover:text-green-800 font-semibold
                       py-2.5 rounded-lg bg-green-50 hover:bg-green-100 transition-colors
                       flex items-center justify-center gap-1.5"
          >
            <Phone size={12} /> New Call
          </button>
        </div>
      )}
    </div>
  );
}
