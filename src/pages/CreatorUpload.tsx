import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CreatorUser, ContentSubmission } from "../types";
import UploadForm from "../components/creator/UploadForm";
import SubmissionsList from "../components/creator/SubmissionsList";
import { fetchMySubmissions, dismissSubmission, cancelSubmission } from "../services/creatorUploadApi";
import { connectCreatorSocket, disconnectSocket } from "../services/socket";

export default function CreatorUpload() {
  const [user, setUser] = useState<CreatorUser | null>(null);
  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedUserJson = localStorage.getItem("influencer_user");
      if (savedUserJson) {
        const parsed = JSON.parse(savedUserJson);
        if (parsed?.name && parsed?.code) setUser(parsed);
      }
    } catch (e) {
      console.error("Error reading session:", e);
    }
  }, []);

  const loadSubmissions = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const subs = await fetchMySubmissions(code);
      setSubmissions(subs);
    } catch (err: any) {
      setError(err?.message || "Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.code) loadSubmissions(user.code);
  }, [user, loadSubmissions]);

  // Live updates: when admin approves/denies, patch the matching submission in place
  // instead of waiting for the creator to manually refresh.
  useEffect(() => {
    if (!user?.code) return;
    const socket = connectCreatorSocket(user.code);

    const handleUpdate = (payload: { id: string; status: "APPROVED" | "DENIED"; product?: string; denialReason?: string; finalFileName?: string }) => {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === payload.id ? { ...s, ...payload } : s))
      );
    };

    socket.on("submissionUpdate", handleUpdate);
    return () => {
      socket.off("submissionUpdate", handleUpdate);
      disconnectSocket();
    };
  }, [user?.code]);

  const handleDismiss = async (id: string) => {
    if (!user?.code) return;
    // Optimistically remove, roll back if the request fails.
    const prev = submissions;
    setSubmissions((cur) => cur.filter((s) => s.id !== id));
    try {
      await dismissSubmission(id, user.code);
    } catch (err: any) {
      setSubmissions(prev);
      setError(err?.message || "Failed to remove submission");
    }
  };

  const handleCancel = async (id: string) => {
    if (!user?.code) return;
    if (!window.confirm("Cancel this submission? The uploaded file will be permanently deleted.")) return;
    const prev = submissions;
    setSubmissions((cur) => cur.filter((s) => s.id !== id));
    try {
      await cancelSubmission(id, user.code);
    } catch (err: any) {
      setSubmissions(prev);
      setError(err?.message || "Failed to cancel submission");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-zinc-300 mb-4">Please log in from the dashboard first.</p>
          <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <header className="sticky top-0 z-40 bg-[#0A0A0B]/90 backdrop-blur-md border-b border-white/5 py-3 px-4 sm:px-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <span className="text-xs font-mono text-zinc-500">{user.code}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Upload Content</h1>
          <p className="text-sm text-zinc-400 mt-1">Submit a video or image for review. Approved content may be used in paid ads.</p>
        </div>

        <UploadForm user={user} onSubmitted={() => loadSubmissions(user.code)} />

        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Your Submissions</h2>
          {error && <p className="text-red-300 text-sm mb-3">{error}</p>}
          {isLoading ? (
            <p className="text-zinc-500 text-sm">Loading...</p>
          ) : (
            <SubmissionsList submissions={submissions} onDismiss={handleDismiss} onCancel={handleCancel} />
          )}
        </div>
      </main>
    </div>
  );
}
