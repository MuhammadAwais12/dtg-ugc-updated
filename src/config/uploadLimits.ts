// Adjust these to change the max upload size — enforced both here (instant feedback)
// and server-side (so it can't be bypassed by calling the API directly).
export const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024; // 200MB
export const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;  // 20MB

export function maxSizeForMimeType(mimeType: string): number {
  return mimeType.startsWith("video/") ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}
