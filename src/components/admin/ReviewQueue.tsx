import React, { useEffect, useMemo, useState } from "react";
import { ContentSubmission, SubmissionStatus } from "../../types";
import { PRODUCTS } from "../../config/products";
import {
  fetchAdminSubmissions,
  approveSubmission,
  denySubmission,
  saveSubmissionComment,
} from "../../services/adminApi";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Play,
  X,
  Image as ImageIcon,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function isVideo(fileType: string) {
  return fileType?.startsWith("video/");
}

function thumbnailUrl(fileId: string) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w500`;
}

const TABS: { label: string; status: SubmissionStatus }[] = [
  { label: "Pending", status: "PENDING" },
  { label: "Approved", status: "APPROVED" },
  { label: "Denied", status: "DENIED" },
];

interface PreviewModalProps {
  submission: ContentSubmission;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onApprove: (product?: string) => Promise<void>;
  onDeny: (reason: string) => Promise<void>;
  onSaveComment: (comment: string) => Promise<void>;
}

function PreviewModal({
  submission,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onApprove,
  onDeny,
  onSaveComment,
}: PreviewModalProps) {
  const [product, setProduct] = useState(submission.product);
  const [busy, setBusy] = useState(false);
  const [denying, setDenying] = useState(false);
  const [denyReason, setDenyReason] = useState("");
  const [comment, setComment] = useState(submission.adminComment || "");
  const [commentSaved, setCommentSaved] = useState(false);

  // Reset local state whenever the loaded submission changes (e.g. auto-advance)
  useEffect(() => {
    setProduct(submission.product);
    setDenying(false);
    setDenyReason("");
    setComment(submission.adminComment || "");
    setCommentSaved(false);
  }, [submission.id]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const isPending = submission.status === "PENDING";

  const handleApprove = async () => {
    setBusy(true);
    try {
      await onApprove(product);
    } finally {
      setBusy(false);
    }
  };

  const handleDenyConfirm = async () => {
    if (!denyReason.trim()) return;
    setBusy(true);
    try {
      await onDeny(denyReason.trim());
    } finally {
      setBusy(false);
    }
  };

  const handleSaveComment = async () => {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await onSaveComment(comment.trim());
      setCommentSaved(true);
      setTimeout(() => setCommentSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2"
          title="Previous"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2"
          title="Next"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      <div
        className="w-full max-w-3xl max-h-[95vh] overflow-y-auto bg-[#141416] border border-white/10 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="min-w-0">
            <p className="text-xs font-mono text-indigo-300">{submission.creatorCode}</p>
            <p className="text-white text-sm font-medium truncate">{submission.originalFileName}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={`https://drive.google.com/file/d/${submission.stagingFileId || submission.finalFileId}/view`}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-white p-1.5"
              title="Open in Drive"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button onClick={onClose} className="text-zinc-400 hover:text-white p-1.5" title="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="aspect-video bg-black">
          <iframe
            src={`https://drive.google.com/file/d/${submission.stagingFileId || submission.finalFileId}/preview`}
            className="w-full h-full"
            style={{ border: "none" }}
            allow="autoplay"
            title={submission.originalFileName}
          />
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {isPending && (
            <>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full bg-[#0d0d0e] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                {PRODUCTS.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={busy}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => setDenying((v) => !v)}
                  disabled={busy}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> Deny
                </button>
              </div>

              {denying && (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    placeholder="Reason for denial (shown to creator)"
                    className="flex-1 bg-[#0d0d0e] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
                  />
                  <button
                    onClick={handleDenyConfirm}
                    disabled={busy || !denyReason.trim()}
                    className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Confirm Deny
                  </button>
                </div>
              )}
            </>
          )}

          {!isPending && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border ${
                submission.status === "APPROVED"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  : "bg-red-500/10 text-red-300 border-red-500/20"
              }`}
            >
              {submission.status}
            </span>
          )}

          <div className="pt-3 border-t border-white/5 space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <MessageSquare className="w-3.5 h-3.5" /> Feedback for creator
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Great video — please replicate with a new hook next time"
              rows={2}
              className="w-full bg-[#0d0d0e] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
            />
            <button
              onClick={handleSaveComment}
              disabled={busy || !comment.trim()}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold disabled:opacity-50"
            >
              {commentSaved ? "Saved ✓" : "Save Comment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewQueue() {
  const [activeStatus, setActiveStatus] = useState<SubmissionStatus>("PENDING");
  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [thumbFailed, setThumbFailed] = useState<Record<string, boolean>>({});

  const load = async (status: SubmissionStatus) => {
    setIsLoading(true);
    setError(null);
    try {
      const subs = await fetchAdminSubmissions(status);
      setSubmissions(subs);
    } catch (err: any) {
      setError(err?.message || "Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPreviewIndex(null);
    load(activeStatus);
  }, [activeStatus]);

  const current = useMemo(
    () => (previewIndex !== null ? submissions[previewIndex] ?? null : null),
    [previewIndex, submissions]
  );

  const handleApprove = async (product?: string) => {
    if (previewIndex === null) return;
    const id = submissions[previewIndex].id;
    try {
      await approveSubmission(id, product);
      const next = submissions.filter((s) => s.id !== id);
      setSubmissions(next);
      // Same index now points at what was the "next" item — auto-advance fullscreen.
      if (next.length === 0) setPreviewIndex(null);
      else setPreviewIndex(Math.min(previewIndex, next.length - 1));
    } catch (err: any) {
      setError(err?.message || "Failed to approve");
    }
  };

  const handleDeny = async (reason: string) => {
    if (previewIndex === null) return;
    const id = submissions[previewIndex].id;
    try {
      await denySubmission(id, reason);
      const next = submissions.filter((s) => s.id !== id);
      setSubmissions(next);
      if (next.length === 0) setPreviewIndex(null);
      else setPreviewIndex(Math.min(previewIndex, next.length - 1));
    } catch (err: any) {
      setError(err?.message || "Failed to deny");
    }
  };

  const handleSaveComment = async (comment: string) => {
    if (previewIndex === null) return;
    const id = submissions[previewIndex].id;
    try {
      await saveSubmissionComment(id, comment);
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, adminComment: comment } : s)));
    } catch (err: any) {
      setError(err?.message || "Failed to save comment");
    }
  };

  if (isLoading) return <p className="text-zinc-500 text-sm">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.status}
            onClick={() => setActiveStatus(t.status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeStatus === t.status
                ? "bg-indigo-600 text-white"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-300 text-sm">{error}</p>}

      {!submissions.length ? (
        <div className="text-center text-zinc-500 text-sm py-10 border border-white/5 rounded-2xl">
          No {activeStatus.toLowerCase()} submissions.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {submissions.map((s, i) => {
            const failed = thumbFailed[s.id];
            const fileId = s.stagingFileId || s.finalFileId || "";
            return (
              <div key={s.id} className="bg-[#141416] border border-white/10 rounded-2xl p-4 flex flex-col gap-3 min-w-0">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-indigo-300 truncate">{s.creatorCode}</p>
                    <p className="text-white text-sm font-medium truncate" title={s.originalFileName}>
                      {s.originalFileName}
                    </p>
                  </div>
                  {s.adminComment && (
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-300 shrink-0 mt-0.5" />
                  )}
                </div>

                <button
                  onClick={() => setPreviewIndex(i)}
                  className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10 bg-black group"
                  title="Preview"
                >
                  {!failed && fileId ? (
                    <img
                      src={thumbnailUrl(fileId)}
                      alt={s.originalFileName}
                      className="w-full h-full object-cover"
                      onError={() => setThumbFailed((prev) => ({ ...prev, [s.id]: true }))}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                    {isVideo(s.fileType) && (
                      <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-90 group-hover:opacity-100 transition">
                        <Play className="w-4 h-4 text-black translate-x-0.5" fill="black" />
                      </div>
                    )}
                  </div>
                </button>

                <p className="text-xs text-zinc-500 truncate">{s.product}</p>
              </div>
            );
          })}
        </div>
      )}

      {current && (
        <PreviewModal
          submission={current}
          onClose={() => setPreviewIndex(null)}
          onPrev={() => setPreviewIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setPreviewIndex((i) => (i !== null && i < submissions.length - 1 ? i + 1 : i))}
          hasPrev={previewIndex !== null && previewIndex > 0}
          hasNext={previewIndex !== null && previewIndex < submissions.length - 1}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onSaveComment={handleSaveComment}
        />
      )}
    </div>
  );
}
