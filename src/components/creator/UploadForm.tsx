import React, { useState } from "react";
import { UploadCloud, CheckCircle2, Loader2 } from "lucide-react";
import { PRODUCTS } from "../../config/products";
import { requestUploadSession, uploadFileToDrive, submitContent } from "../../services/creatorUploadApi";
import { CreatorUser } from "../../types";
import { maxSizeForMimeType, formatBytes } from "../../config/uploadLimits";

interface UploadFormProps {
  user: CreatorUser;
  onSubmitted: () => void;
}

export default function UploadForm({ user, onSubmitted }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [product, setProduct] = useState(PRODUCTS[0] || "");
  const [agreed, setAgreed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setError(null);
    setFile(null);

    if (!selected) return;

    const max = maxSizeForMimeType(selected.type);
    if (selected.size > max) {
      setError(
        `${selected.type.startsWith("video/") ? "Video" : "Image"} is too large (${formatBytes(selected.size)}). Max allowed is ${formatBytes(max)}.`
      );
      e.target.value = ""; // reset the input so the same oversized file can be re-picked after fixing
      return;
    }

    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) return setError("Please choose a video or image file to upload.");
    if (!product) return setError("Please select a product.");
    if (!agreed) return setError("You must accept the usage-rights checkbox to submit.");

    setIsSubmitting(true);
    setProgress(0);
    try {
      const { uploadUrl, stagingFolderId } = await requestUploadSession(user.code, file.name, file.type, file.size);
      const driveFile = await uploadFileToDrive(uploadUrl, file, setProgress);
      await submitContent({
        creatorCode: user.code,
        creatorName: user.name,
        product,
        driveFileId: driveFile.id,
        stagingFolderId,
        originalFileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        usageRightsAccepted: agreed,
      });

      setSuccess(true);
      setFile(null);
      setAgreed(false);
      setProgress(0);
      onSubmitted();
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err?.message || "Upload failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#141416] border border-white/10 rounded-2xl p-5 sm:p-8 space-y-5">
      <div>
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Video or Image
        </label>
        <label
          htmlFor="content-file"
          className="flex flex-col items-center justify-center gap-2 border border-dashed border-white/15 rounded-xl px-4 py-8 text-center cursor-pointer hover:border-indigo-500/60 transition"
        >
          <UploadCloud className="w-6 h-6 text-zinc-400" />
          <span className="text-sm text-zinc-300">{file ? file.name : "Tap to choose a file"}</span>
          <span className="text-xs text-zinc-500">
            Video up to {formatBytes(maxSizeForMimeType("video/mp4"))} · Image up to {formatBytes(maxSizeForMimeType("image/jpeg"))}
          </span>
          <input id="content-file" type="file" accept="video/*,image/*" onChange={handleFileChange} className="hidden" />
        </label>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Product</label>
        <select
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          className="w-full bg-[#0d0d0e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          {PRODUCTS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-3 text-sm text-zinc-300 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 w-4 h-4 accent-indigo-600"
        />
        <span>I grant Down to Ground rights to use this content in paid advertising</span>
      </label>

      {error && <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>}
      {success && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Submitted! You'll see it below as Pending.
        </div>
      )}

      {isSubmitting && (
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
      >
        {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Uploading {progress}%</>) : "Submit for Review"}
      </button>
    </form>
  );
}
