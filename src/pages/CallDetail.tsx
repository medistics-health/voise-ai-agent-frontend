import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";
import {
  ArrowLeft,
  Phone,
  User,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  FileText,
  RefreshCcw,
  Pencil,
  Save,
} from "lucide-react";

interface TranscriptEntry {
  id: string;
  speaker: "caller" | "ai" | "system";
  text: string;
  timestamp: string;
  confidence: number | null;
}

interface SOAPNote {
  id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  status: "pending_review" | "approved" | "rejected" | "edited";
  source: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

interface CallDetail {
  id: string;
  roomName: string;
  callerNumber: string | null;
  callerName: string | null;
  status: string;
  intent: string | null;
  identityVerified: boolean;
  transferredTo: string | null;
  duration: number | null;
  startedAt: string;
  endedAt: string | null;
  metadata?: {
    insuranceCompany?: string;
    insurancePhone?: string;
    patientName?: string;
  } | null;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    dob: string;
    mobileNumber: string | null;
    payerMemberId?: string | null;
    memberPlanStatus?: string | null;
    memberPlanStatusUpdatedAt?: string | null;
  } | null;
  transcripts: TranscriptEntry[];
  note: SOAPNote | null;
}

const speakerStyles: Record<
  string,
  { label: string; align: string; bg: string }
> = {
  caller: {
    label: "Caller",
    align: "justify-start",
    bg: "bg-slate-100 text-slate-800",
  },
  ai: {
    label: "AI Assistant",
    align: "justify-end",
    bg: "bg-brand-100 text-brand-800",
  },
  system: {
    label: "System",
    align: "justify-center",
    bg: "bg-amber-50 text-amber-700",
  },
};

export default function CallDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [call, setCall] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [savingPatientStatus, setSavingPatientStatus] = useState(false);
  const [patientStatus, setPatientStatus] = useState("");
  const [noteForm, setNoteForm] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    reviewNotes: "",
  });

  useEffect(() => {
    fetchCall();
  }, [id]);

  const fetchCall = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/calls/${id}`);
      const data = res.data.data;
      setCall(data);
      setPatientStatus(data.patient?.memberPlanStatus || "");
      if (data.note) {
        setNoteForm({
          subjective: data.note.subjective,
          objective: data.note.objective,
          assessment: data.note.assessment,
          plan: data.note.plan,
          reviewNotes: "",
        });
      }
    } catch {
      toast.error("Failed to load call details");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (status: "approved" | "rejected" | "edited") => {
    if (!call?.note) return;
    setReviewing(true);
    try {
      await api.patch(`/call-notes/${call.note.id}/review`, {
        status,
        ...(status === "edited" ? noteForm : {}),
        reviewNotes: noteForm.reviewNotes,
      });
      toast.success(`Note ${status}`);
      setEditingNote(false);
      fetchCall();
    } catch {
      toast.error("Failed to update note");
    } finally {
      setReviewing(false);
    }
  };

  const regenerateNote = async () => {
    if (!call) return;
    try {
      await api.post(`/calls/${call.id}/generate-note`);
      toast.success("Note regenerated");
      fetchCall();
    } catch {
      toast.error("Failed to regenerate note");
    }
  };

  const updatePatientStatus = async () => {
    if (!call?.patient?.id || !patientStatus) {
      toast.error("Select a patient status first");
      return;
    }
    setSavingPatientStatus(true);
    try {
      await api.patch(`/patients/${call.patient.id}/insurance-status`, {
        memberPlanStatus: patientStatus,
      });
      toast.success("Patient status updated");
      fetchCall();
    } catch {
      toast.error("Failed to update patient status");
    } finally {
      setSavingPatientStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Call not found.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      {/* Back Button */}
      <button
        onClick={() => navigate("/calls")}
        className="btn-ghost inline-flex items-center gap-2 text-xs"
      >
        <ArrowLeft size={14} /> Back to Calls
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-brand-100 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-ink-950 flex items-center gap-2">
              <Phone size={18} className="text-brand-600" />
              {call.metadata?.insuranceCompany ||
                call.callerName ||
                call.callerNumber ||
                "Unknown Caller"}
            </h1>
            {call.metadata?.insurancePhone && (
              <p className="text-xs text-slate-500 mt-0.5">
                {call.metadata.insurancePhone}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Room: {call.roomName} • Started:{" "}
              {new Date(call.startedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                call.status === "completed"
                  ? "bg-blue-100 text-blue-700"
                  : call.status === "active"
                    ? "bg-green-100 text-green-700"
                    : call.status === "transferred"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600"
              }`}
            >
              {call.status}
            </span>
          </div>
        </div>

        {/* Meta Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="flex items-center gap-2">
            <User size={14} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Patient</p>
              <p className="text-xs font-semibold text-ink-950">
                {call.patient
                  ? `${call.patient.firstName} ${call.patient.lastName}`
                  : "Not identified"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Identity</p>
              <p className="text-xs font-semibold">
                {call.identityVerified ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle size={12} /> Verified
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1">
                    <XCircle size={12} /> Not verified
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Duration</p>
              <p className="text-xs font-semibold text-ink-950 font-mono">
                {call.duration
                  ? `${Math.floor(call.duration / 60)}:${(call.duration % 60)
                      .toString()
                      .padStart(2, "0")}`
                  : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Intent</p>
              <p className="text-xs font-semibold text-ink-950 capitalize">
                {call.intent?.replace(/_/g, " ") || "—"}
              </p>
            </div>
          </div>
        </div>

        {call.patient && (
          <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px]">
                <p className="text-xs text-slate-500">Patient coverage status</p>
                <select
                  className="input-field mt-2 h-10"
                  value={patientStatus}
                  onChange={(e) => setPatientStatus(e.target.value)}
                >
                  <option value="">Select status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Unknown">Unknown</option>
                  <option value="Error">Error</option>
                  <option value="No Answer">No Answer</option>
                  <option value="Filed">Filed</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <button
                onClick={updatePatientStatus}
                disabled={savingPatientStatus}
                className="btn-primary inline-flex items-center gap-2 text-xs"
              >
                <Save size={12} />
                {savingPatientStatus ? "Saving..." : "Save Status"}
              </button>
              <div className="text-xs text-slate-500">
                <p>
                  Member ID: {call.patient.payerMemberId || "N/A"}
                </p>
                <p>
                  Updated:{" "}
                  {call.patient.memberPlanStatusUpdatedAt
                    ? new Date(call.patient.memberPlanStatusUpdatedAt).toLocaleString()
                    : "Not updated yet"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transcript */}
        <div className="bg-white rounded-xl border border-brand-100">
          <div className="px-6 py-4 border-b border-brand-100">
            <h2 className="text-sm font-bold text-ink-950">Transcript</h2>
            <p className="text-xs text-slate-500">
              {call.transcripts.length} messages
            </p>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto space-y-3">
            {call.transcripts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                No transcript available.
              </p>
            ) : (
              call.transcripts.map((t) => {
                const style = speakerStyles[t.speaker] || speakerStyles.system;
                return (
                  <div key={t.id} className={`flex ${style.align}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 ${style.bg}`}
                    >
                      <p className="text-[10px] font-semibold opacity-70 mb-0.5">
                        {style.label}
                      </p>
                      <p className="text-xs leading-relaxed">{t.text}</p>
                      <p className="text-[9px] opacity-50 mt-1">
                        {new Date(t.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SOAP Note */}
        <div className="bg-white rounded-xl border border-brand-100">
          <div className="px-6 py-4 border-b border-brand-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink-950">SOAP Note</h2>
              <p className="text-xs text-slate-500">
                {call.note
                  ? `Status: ${call.note.status.replace(/_/g, " ")}`
                  : "Not generated"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={regenerateNote}
                className="btn-ghost px-2 py-1.5 text-xs inline-flex items-center gap-1"
              >
                <RefreshCcw size={12} /> Regenerate
              </button>
              {call.note && call.note.status === "pending_review" && (
                <button
                  onClick={() => setEditingNote(!editingNote)}
                  className="btn-ghost px-2 py-1.5 text-xs inline-flex items-center gap-1"
                >
                  <Pencil size={12} /> Edit
                </button>
              )}
            </div>
          </div>

          {call.note ? (
            <div className="p-6 space-y-4">
              {editingNote ? (
                <>
                  {(
                    ["subjective", "objective", "assessment", "plan"] as const
                  ).map((field) => (
                    <div key={field}>
                      <label className="label capitalize font-bold">
                        {field === "subjective"
                          ? "S — Subjective"
                          : field === "objective"
                            ? "O — Objective"
                            : field === "assessment"
                              ? "A — Assessment"
                              : "P — Plan"}
                      </label>
                      <textarea
                        rows={3}
                        className="input-field"
                        value={noteForm[field]}
                        onChange={(e) =>
                          setNoteForm((prev) => ({
                            ...prev,
                            [field]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                  <div>
                    <label className="label">Review Notes</label>
                    <textarea
                      rows={2}
                      className="input-field"
                      placeholder="Optional reviewer notes..."
                      value={noteForm.reviewNotes}
                      onChange={(e) =>
                        setNoteForm((prev) => ({
                          ...prev,
                          reviewNotes: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleReview("edited")}
                      disabled={reviewing}
                      className="btn-primary text-xs"
                    >
                      {reviewing ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={() => setEditingNote(false)}
                      className="btn-ghost text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {[
                    {
                      key: "subjective",
                      label: "S — Subjective",
                      value: call.note.subjective,
                    },
                    {
                      key: "objective",
                      label: "O — Objective",
                      value: call.note.objective,
                    },
                    {
                      key: "assessment",
                      label: "A — Assessment",
                      value: call.note.assessment,
                    },
                    { key: "plan", label: "P — Plan", value: call.note.plan },
                  ].map((section) => (
                    <div key={section.key}>
                      <h3 className="text-xs font-bold text-ink-950 mb-1">
                        {section.label}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed bg-brand-50/50 rounded-lg p-3">
                        {section.value || "—"}
                      </p>
                    </div>
                  ))}

                  {/* Review Actions */}
                  {call.note.status === "pending_review" && (
                    <div className="flex gap-2 pt-4 border-t border-brand-100">
                      <button
                        onClick={() => handleReview("approved")}
                        disabled={reviewing}
                        className="btn-primary text-xs inline-flex items-center gap-1"
                      >
                        <CheckCircle size={12} />{" "}
                        {reviewing ? "Saving..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleReview("rejected")}
                        disabled={reviewing}
                        className="btn-ghost text-xs text-red-600 inline-flex items-center gap-1"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <FileText size={32} className="text-brand-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">
                SOAP note not yet generated.
              </p>
              <button
                onClick={regenerateNote}
                className="btn-primary text-xs mt-3"
              >
                Generate Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
