import { Activity } from "lucide-react";

interface Props {
  subtitle: string;
}

export default function AuthHeader({ subtitle }: Props) {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-500 to-purple-500 shadow-lg shadow-brand-500/30 mb-5">
        <Activity size={28} className="text-white" />
      </div>

      <h1 className="text-4xl font-bold text-ink-950 tracking-tight">
        VoiceAI Receptionist
      </h1>

      <p className="text-lg text-slate-600 font-medium mt-1">{subtitle}</p>
    </div>
  );
}