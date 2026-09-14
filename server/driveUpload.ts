import path from "path";
import { auth, drive } from "./googleDrive.js";

const STAGING_ROOT = process.env.GOOGLE_DRIVE_STAGING_FOLDER_ID || "";
const APPROVED_ROOT = process.env.GOOGLE_DRIVE_APPROVED_FOLDER_ID || "";

async function findOrCreateChildFolder(parentId: string, creatorCode: string): Promise<string> {
  const safeCode = creatorCode.replace(/'/g, "\\'");
  const q = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${safeCode}' and trashed = false`;
  const list = await drive.files.list({
    q,
    fields: "files(id, name)",
    pageSize: 5,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: "allDrives",
  });
  const existing = list.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: {
      name: creatorCode,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  if (!created.data.id) throw new Error("Failed to create Drive folder");
  return created.data.id;
}

export async function getCreatorStagingFolderId(creatorCode: string): Promise<string> {
  if (!STAGING_ROOT) throw new Error("GOOGLE_DRIVE_STAGING_FOLDER_ID is not configured");
  return findOrCreateChildFolder(STAGING_ROOT, creatorCode);
}

export async function getCreatorApprovedFolderId(creatorCode: string): Promise<string> {
  if (!APPROVED_ROOT) throw new Error("GOOGLE_DRIVE_APPROVED_FOLDER_ID is not configured");
  return findOrCreateChildFolder(APPROVED_ROOT, creatorCode);
}

// Initiates a resumable upload session that the browser can PUT bytes to directly,
// bypassing our serverless function's request body limit entirely.
// The Origin header here is required — without it Google does not enable CORS on
// the returned session URL, and the browser's direct PUT fails as a generic
// "network error" (not a helpful HTTP status).
export async function createResumableUploadSession(
  fileName: string,
  mimeType: string,
  parentFolderId: string,
  origin: string
): Promise<string> {
  const accessToken = (await auth.getAccessToken()) as string;
  if (!accessToken) throw new Error("Failed to obtain Google access token");

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        Origin: origin,
      },
      body: JSON.stringify({
        name: fileName,
        parents: [parentFolderId],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to start Drive resumable upload session: ${res.status} ${errText}`);
  }

  const location = res.headers.get("Location") || res.headers.get("location");
  if (!location) throw new Error("Drive did not return a resumable upload session URL");
  return location;
}

function extensionFor(originalFileName: string, mimeType: string): string {
  const fromName = path.extname(originalFileName);
  if (fromName) return fromName;
  if (mimeType.startsWith("video/")) return ".mp4";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return "";
}

export async function approveAndMoveFile(opts: {
  fileId: string;
  stagingFolderId: string;
  creatorCode: string;
  product: string;
  originalFileName: string;
  mimeType: string;
  version: number;
}): Promise<{ finalFileId: string; finalFileName: string }> {
  const { fileId, stagingFolderId, creatorCode, product, originalFileName, mimeType, version } = opts;

  const approvedFolderId = await getCreatorApprovedFolderId(creatorCode);
  const ext = extensionFor(originalFileName, mimeType);
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const safeProduct = product.replace(/[^a-zA-Z0-9-_]+/g, "_");
  const finalFileName = `${creatorCode}_${safeProduct}_${dateStr}_v${version}${ext}`;

  await drive.files.update({
    fileId,
    addParents: approvedFolderId,
    removeParents: stagingFolderId,
    requestBody: { name: finalFileName },
    fields: "id, name, parents",
    supportsAllDrives: true,
  });

  return { finalFileId: fileId, finalFileName };
}

// Permanently removes the file from Google Drive staging when admin denies a submission.
// Tolerates the file already being gone (e.g. manually removed) but surfaces any other failure
// so a denial is never silently marked complete while the file still sits in staging.
export async function deleteStagingFile(fileId: string): Promise<void> {
  try {
    await drive.files.delete({ fileId, supportsAllDrives: true });
  } catch (err: any) {
    const status = err?.code ?? err?.response?.status;
    if (status !== 404) throw err;
  }
}
