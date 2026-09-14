import { ContentSubmission } from "../types";

export async function requestUploadSession(
  creatorCode: string,
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<{ uploadUrl: string; stagingFolderId: string }> {
  const res = await fetch("/api/creator/upload-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creatorCode, fileName, mimeType, fileSize }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to start upload");
  }
  return res.json();
}

// Uploads directly to Google Drive, bypassing our own server entirely.
export async function uploadFileToDrive(
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ id: string; name: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Unexpected response from Google Drive"));
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status}). Please try again.`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload. Please try again."));

    xhr.send(file);
  });
}

export async function submitContent(payload: {
  creatorCode: string;
  creatorName?: string;
  product: string;
  driveFileId: string;
  stagingFolderId: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  usageRightsAccepted: boolean;
}): Promise<ContentSubmission> {
  const res = await fetch("/api/creator/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to submit content");
  }
  const data = await res.json();
  return data.submission;
}

export async function fetchMySubmissions(creatorCode: string): Promise<ContentSubmission[]> {
  const res = await fetch(`/api/creator/submissions?code=${encodeURIComponent(creatorCode)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load submissions");
  }
  const data = await res.json();
  return data.submissions || [];
}

export async function dismissSubmission(id: string, creatorCode: string): Promise<void> {
  const res = await fetch(`/api/creator/submissions/${id}/dismiss`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creatorCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to dismiss submission");
  }
}

export async function cancelSubmission(id: string, creatorCode: string): Promise<void> {
  const res = await fetch(`/api/creator/submissions/${id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creatorCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to cancel submission");
  }
}
