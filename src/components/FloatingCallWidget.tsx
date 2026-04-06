import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Loader2,
  Maximize2,
  Minimize2,
  Phone,
  PhoneOff,
  Send,
  User,
  Volume2,
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
    callSessionId,
    isWidgetOpen,
    isWidgetMinimized,
    patientMetadata,
    callSource,
    startCall,
    endCall,
    sendMessage,
    closeWidget,
    toggleMinimize,
    resetCall,
  } = useCall();

  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);

  const temporaryControlsEnabled =
    callSource === "test_call" || callSource === "patient_list";
  const callDisplayName =
    (callSource === "patient_list" || callSource === "queue_system") &&
    patientMetadata
      ? patientMetadata.name
      : "AI Receptionist";
  const isBusy = speakingState === "ai" || speakingState === "processing";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (speakingState !== "ai" || !barsRef.current) return;

    const interval = setInterval(() => {
      if (!barsRef.current) return;
      const bars = barsRef.current.children;
      for (let index = 0; index < bars.length; index++) {
        (bars[index] as HTMLElement).style.height = `${Math.max(
          3,
          Math.random() * 28,
        )}px`;
      }
    }, 130);

    return () => clearInterval(interval);
  }, [speakingState]);

  if (!isWidgetOpen) return null;

  const fmtDuration = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText("");
  };

  const handleEndAndClose = async () => {
    await endCall();
    setTimeout(() => closeWidget(), 500);
  };

  if (isWidgetMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <button
          onClick={toggleMinimize}
          className="group flex items-center gap-2.5 rounded-full border border-brand-200 bg-white px-4 py-2.5 shadow-xl shadow-brand-600/10 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-brand-600/15"
        >
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700">
              <Bot size={16} className="text-white" />
            </div>
            {status === "connected" && (
              <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500 animate-pulse" />
            )}
          </div>
          <div className="text-left">
            <p className="text-xs font-bold leading-none text-ink-950">
              {callSource === "patient_list" && patientMetadata
                ? patientMetadata.name
                : status === "connected"
                  ? "In Call"
                  : status === "ended"
                    ? "Call Ended"
                    : "Ready"}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {fmtDuration(callDuration)}
            </p>
          </div>
          {status === "connected" && (
            <div className="ml-1 flex h-4 items-end gap-[2px]">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className={`w-[3px] rounded-full transition-all duration-100 ${
                    speakingState === "ai"
                      ? "bg-violet-400 animate-pulse"
                      : temporaryControlsEnabled && speakingState === "user"
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
            className="ml-1 text-slate-400 transition-colors group-hover:text-brand-600"
          />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex max-h-[620px] w-[400px] flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-2xl shadow-black/10">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-brand-100 bg-gradient-to-r from-brand-50 to-white px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                status === "connected"
                  ? "bg-gradient-to-br from-brand-500 to-brand-700"
                  : status === "ended"
                    ? "bg-slate-300"
                    : "bg-slate-200"
              }`}
            >
              <Bot
                size={14}
                className={status === "connected" ? "text-white" : "text-slate-500"}
              />
            </div>
            {status === "connected" && (
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 animate-pulse" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold leading-none text-ink-950">
              {callDisplayName}
            </p>
            {(callSource === "patient_list" || callSource === "queue_system") &&
              patientMetadata?.insuranceCompany && (
                <p className="mt-0.5 text-[10px] font-medium leading-none text-brand-600">
                  {patientMetadata.insuranceCompany}
                  {patientMetadata.insurancePhone
                    ? ` · ${patientMetadata.insurancePhone}`
                    : ""}
                </p>
              )}
            <p className="mt-0.5 text-[10px] text-slate-500">
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
            <button
              onClick={handleEndAndClose}
              className="rounded-full bg-red-600 p-1.5 text-white transition-colors hover:bg-red-700"
              title="End call"
            >
              <PhoneOff size={13} />
            </button>
          )}
          {status === "connected" && (
            <button
              onClick={toggleMinimize}
              className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              title="Minimize"
            >
              <Minimize2 size={13} />
            </button>
          )}
          <button
            onClick={closeWidget}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title={status === "connected" ? "End call & close" : "Close"}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {status === "connected" && (
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-brand-50 bg-slate-50/50 px-4 py-2.5">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              speakingState === "ai"
                ? "bg-violet-100"
                : temporaryControlsEnabled && speakingState === "user"
                  ? "bg-brand-100"
                  : speakingState === "processing"
                    ? "bg-amber-100"
                    : "bg-slate-100"
            }`}
          >
            {speakingState === "processing" ? (
              <Loader2 size={12} className="animate-spin text-amber-600" />
            ) : speakingState === "ai" ? (
              <Volume2 size={12} className="text-violet-600" />
            ) : (
              <Volume2
                size={12}
                className="text-slate-400"
              />
            )}
          </div>

          <div ref={barsRef} className="flex h-6 flex-1 items-end gap-[2px]">
            {Array.from({ length: 24 }).map((_, index) => (
              <div
                key={index}
                className={`max-w-[6px] flex-1 rounded-full transition-all duration-75 ${
                  speakingState === "ai"
                    ? "bg-violet-300"
                    : temporaryControlsEnabled && speakingState === "user"
                      ? "bg-brand-300"
                      : "bg-slate-200"
                }`}
                style={{ height: "3px" }}
              />
            ))}
          </div>

          <span
            className={`flex-shrink-0 text-[10px] font-semibold ${
              speakingState === "ai"
                ? "text-violet-600"
                : speakingState === "processing"
                  ? "text-amber-600"
                  : "text-slate-400"
            }`}
          >
            {speakingState === "ai"
              ? "Speaking"
              : speakingState === "processing"
                ? "Thinking"
                : "Ready"}
          </span>
        </div>
      )}

      <div
        className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2"
        style={{ maxHeight: status === "connected" ? "320px" : "400px" }}
      >
        {status === "idle" && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-200 bg-gradient-to-br from-brand-100 to-brand-50">
              <Phone size={24} className="text-brand-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-ink-950">Start a Test Call</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Use text input to test the AI receptionist
              </p>
            </div>
            <button
              onClick={() => startCall()}
              className="flex items-center gap-2 rounded-full bg-green-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-600/25 transition-all hover:scale-105 hover:bg-green-700"
            >
              <Phone size={16} /> Start Call
            </button>
          </div>
        )}

        {status === "connecting" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 animate-ping rounded-full border-2 border-brand-300 opacity-30" />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-brand-50">
                <Loader2 size={24} className="animate-spin text-brand-500" />
              </div>
            </div>
            <p className="text-xs font-medium text-brand-600">Connecting to Med...</p>
          </div>
        )}

        {(status === "connected" || status === "ended") &&
          messages.map((message) => {
            if (message.speaker === "system") {
              return (
                <div key={message.id} className="flex justify-center">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[9px] text-slate-500">
                    {message.text}
                  </span>
                </div>
              );
            }

            const isAI = message.speaker === "ai";
            return (
              <div
                key={message.id}
                className={`flex ${isAI ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 ${
                    isAI
                      ? "bg-slate-100 text-slate-800"
                      : "bg-brand-600 text-white"
                  }`}
                >
                  <div className="mb-0.5 flex items-center gap-1">
                    {isAI ? (
                      <Bot size={9} className="opacity-40" />
                    ) : (
                      <User size={9} className="opacity-40" />
                    )}
                    <span className="text-[9px] font-semibold opacity-40">
                      {isAI ? "Medistics AI" : "You"}
                    </span>
                    <span className="ml-auto text-[8px] opacity-25">
                      {message.time}
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed">{message.text}</p>
                </div>
              </div>
            );
          })}
        <div ref={messagesEndRef} />
      </div>

      {status === "connected" && temporaryControlsEnabled && (
        <div className="flex-shrink-0 border-t border-brand-100 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSend();
              }}
              placeholder="Type message..."
              disabled={isBusy}
              className="flex-1 rounded-xl border border-brand-100 px-3 py-2 text-xs outline-none transition-all placeholder:text-slate-400 focus:border-brand-300 focus:ring-1 focus:ring-brand-200 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isBusy}
              className="rounded-xl bg-brand-600 px-3 text-white transition-colors hover:bg-brand-700 disabled:bg-brand-300"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}

      {status === "ended" && (
        <div className="flex-shrink-0 space-y-2 border-t border-brand-100 p-3">
          <div className="flex gap-2">
            {callSessionId && (
              <button
                onClick={() => {
                  resetCall();
                  closeWidget();
                  navigate(`/calls/${callSessionId}`);
                }}
                className="flex-1 rounded-lg border border-brand-100 py-2.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                View Call Details →
              </button>
            )}
            <button
              onClick={() => {
                resetCall();
                closeWidget();
              }}
              className="flex-1 rounded-lg border border-slate-100 py-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
            >
              Close
            </button>
          </div>
          <button
            onClick={() => {
              resetCall();
              startCall();
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-50 py-2.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100 hover:text-green-800"
          >
            <Phone size={12} /> New Call
          </button>
        </div>
      )}
    </div>
  );
}
