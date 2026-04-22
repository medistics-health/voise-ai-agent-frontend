import { useState, useRef, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import toast from "react-hot-toast";
import {
  Upload as UploadIcon,
  FileText,
  X,
  CheckCircle2,
  Loader2,
  Download,
} from "lucide-react";
import PageHeader from "../components/PageHeader";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Only CSV files are supported");
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/eligibility/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const jobId = res.data.data?.id;
      toast.success("Upload successful! Processing started.");
      navigate(jobId ? `/results/${jobId}` : "/results");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSample = () => {
    const header =
      "Patient First Name,Patient Last Name,Patient Middle Name,Patient DOB,Patient Gender,Patient email,patient Mobile Number,Patient Address Line 1,Patient Address Line 2,Patient City,Patient State,Patient Zip,Insurance Name,Member ID,Practice Location Name,Group Name,Providers\n";
    const row =
      "John,Doe,William,2001-12-01,Male,john@example.com,555-0100,123 Main St,Apt 4B,Dallas,TX,75001,Aetna,MEM123456,Garden State Medical Group- North Bergen,Virtual Care LLC,ANIL S PATEL MD\n";
    const blob = new Blob([header + row], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_patients.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const sizeKb = file ? (file.size / 1024).toFixed(1) : null;

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Upload CSV"
        subtitle="Upload a CSV file to import patients, map linked records, and only call UHC when coverage data is missing."
        icon={FileText}
      />
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500 mt-2">
          <strong>Imported Coverage:</strong> If `Insurance Name` or `Member ID`
          is present, that row skips the UHC API. If both are present, the
          patient is marked `Active`; if only one is present, the patient is
          marked `Unknown`. <strong>Record Mapping:</strong> `Insurance Name`,
          `Practice Location Name`, `Group Name`, and `Providers` are matched
          to existing records. <strong>Auto-Queue:</strong> Only patients with
          no coverage status move into the call queue.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer bg-white
          ${
            dragging
              ? "border-brand-400 bg-brand-50"
              : file
                ? "border-emerald-400 bg-emerald-50 cursor-default"
                : "border-slate-300 hover:border-brand-400 hover:bg-slate-50"
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        <div className="p-12 flex flex-col items-center text-center gap-4">
          {file ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-slate-900 font-bold">{file.name}</p>
                <p className="text-slate-500 text-sm mt-1 font-medium">
                  {sizeKb} KB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
              >
                <X size={14} /> Remove file
              </button>
            </>
          ) : (
            <>
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${dragging ? "bg-brand-100 border border-brand-200" : "bg-slate-100 border border-slate-200"}`}
              >
                <UploadIcon
                  size={28}
                  className={dragging ? "text-brand-600" : "text-slate-400"}
                />
              </div>
              <div>
                <p className="text-slate-900 font-bold">
                  {dragging
                    ? "Drop your file here"
                    : "Drag & drop your CSV here"}
                </p>
                <p className="text-slate-500 text-sm mt-1 font-medium">
                  or click to browse
                </p>
              </div>
              <p className="text-xs font-semibold text-slate-400">
                Max 500 rows · Max 5 MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={handleSubmit}
        disabled={!file || uploading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <UploadIcon size={16} />
            Upload &amp; Start Eligibility Check
          </>
        )}
      </button>

      {/* Format guide */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileText size={16} className="text-brand-600" />
            Need a template?
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Download our sample CSV file to ensure your data includes patient
            address columns plus `Insurance Name`, `Member ID`,
            `Practice Location Name`, `Group Name`, and `Providers`.
          </p>
        </div>
        <button
          onClick={handleDownloadSample}
          className="btn-ghost flex items-center gap-2 whitespace-nowrap"
        >
          <Download size={16} className="text-slate-500" />
          Download Sample CSV
        </button>
      </div>
    </div>
  );
}
