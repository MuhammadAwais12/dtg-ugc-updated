import React from "react";
import { ContentSubmission } from "../../types";
import { CheckCircle2, Clock, XCircle, X, Ban } from "lucide-react";

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  DENIED: "bg-red-500/10 text-red-300 border-red-500/20",
  CANCELLED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-3.5 h-3.5" />,
  APPROVED: <CheckCircle2 className="w-3.5 h-3.5" />,
  DENIED: <XCircle className="w-3.5 h-3.5" />,
  CANCELLED: <Ban className="w-3.5 h-3.5" />,
};

interface SubmissionsListProps {
  submissions: ContentSubmission[];
  onDismiss: (id: string) => void;
  onCancel: (id: string) => void;
}

export default function SubmissionsList({ submissions, onDismiss, onCancel }: SubmissionsListProps) {
  if (!submissions.length) {
    return <div className="text-center text-zinc-500 text-sm py-10 border border-white/5 rounded-2xl">No submissions yet.</div>;
  }

  return (
    <div className="space-y-3">
      {submissions.map((s) => {
        const isPending = s.status === "PENDING";
        return (
          <div key={s.id} className="bg-[#141416] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{s.originalFileName}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.product}</p>
              {s.status === "DENIED" && s.denialReason && (
                <p className="text-xs text-red-300 mt-1.5">Reason: {s.denialReason}</p>
              )}
              {s.adminComment && (
                <p className="text-xs text-indigo-300 mt-1.5">Feedback: {s.adminComment}</p>
              )}
            </div>
            <div className="shrink-0 self-start sm:self-center flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border ${statusStyles[s.status]}`}>
                {statusIcons[s.status]}
                {s.status}
              </span>
              <button
                onClick={() => (isPending ? onCancel(s.id) : onDismiss(s.id))}
                title={isPending ? "Cancel submission" : "Remove from dashboard"}
                className="text-zinc-500 hover:text-white hover:bg-white/10 rounded-full p-1 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
