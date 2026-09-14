import { Router } from "express";
import { normalizeCreatorCode } from "../../src/utils/creator.js";
import { getCreatorStagingFolderId, createResumableUploadSession, deleteStagingFile } from "../driveUpload.js";
import { createSubmission, listSubmissionsForCreator, dismissSubmission, cancelSubmission } from "../submissions.js";
import { maxSizeForMimeType, formatBytes } from "../../src/config/uploadLimits.js";

const router = Router();

// Step 1: client asks for a place to upload the file
router.post("/upload-session", async (req, res) => {
  try {
    const { creatorCode, fileName, mimeType, fileSize } = req.body || {};
    if (!creatorCode || !fileName || !mimeType || !fileSize) {
      return res.status(400).json({ error: "creatorCode, fileName, mimeType and fileSize are required" });
    }

    // Re-check the size limit server-side — the client check can be bypassed by
    // calling this endpoint directly, so this is the enforcement that actually counts.
    const max = maxSizeForMimeType(mimeType);
    if (fileSize > max) {
      return res.status(413).json({
        error: `File is too large (${formatBytes(fileSize)}). Max allowed is ${formatBytes(max)}.`,
      });
    }

    const origin = req.headers.origin || `${req.protocol}://${req.get("host")}`;
    const normalizedCode = normalizeCreatorCode(creatorCode);
    const stagingFolderId = await getCreatorStagingFolderId(normalizedCode);
    const uploadUrl = await createResumableUploadSession(fileName, mimeType, stagingFolderId, origin);
    res.json({ uploadUrl, stagingFolderId });
  } catch (error: any) {
    console.error("Error creating upload session:", error);
    res.status(500).json({ error: error?.message || "Failed to start upload" });
  }
});

// Step 2: client confirms the upload finished and Drive returned a file id
router.post("/submissions", async (req, res) => {
  try {
    const {
      creatorCode,
      creatorName,
      product,
      driveFileId,
      stagingFolderId,
      originalFileName,
      fileType,
      fileSize,
      usageRightsAccepted,
    } = req.body || {};

    if (!creatorCode || !product || !driveFileId || !stagingFolderId || !originalFileName || !fileType) {
      return res.status(400).json({ error: "Missing required submission fields" });
    }
    if (!usageRightsAccepted) {
      return res.status(400).json({ error: "Usage rights must be accepted" });
    }

    const normalizedCode = normalizeCreatorCode(creatorCode);
    const submission = await createSubmission({
      creatorCode: normalizedCode,
      creatorName,
      product,
      originalFileName,
      fileType,
      fileSize,
      stagingFileId: driveFileId,
      stagingFolderId,
      usageRightsAccepted: true,
    });

    res.status(201).json({ success: true, submission });
  } catch (error: any) {
    console.error("Error creating submission:", error);
    res.status(500).json({ error: error?.message || "Failed to create submission" });
  }
});

// Creator can only see their own submissions
router.get("/submissions", async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) return res.status(400).json({ error: "code query parameter is required" });
    const normalizedCode = normalizeCreatorCode(code);
    const submissions = await listSubmissionsForCreator(normalizedCode);
    res.json({ submissions });
  } catch (error: any) {
    console.error("Error listing creator submissions:", error);
    res.status(500).json({ error: error?.message || "Failed to load submissions" });
  }
});

// Creator removes a resolved (approved/denied) submission from their own dashboard view.
// Scoped to their own creatorCode; pending submissions cannot be dismissed.
router.post("/submissions/:id/dismiss", async (req, res) => {
  try {
    const { creatorCode } = req.body || {};
    if (!creatorCode) return res.status(400).json({ error: "creatorCode is required" });
    const normalizedCode = normalizeCreatorCode(creatorCode);
    const ok = await dismissSubmission(req.params.id, normalizedCode);
    if (!ok) {
      return res.status(400).json({ error: "Submission not found, not yours, or still pending" });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error dismissing submission:", error);
    res.status(500).json({ error: error?.message || "Failed to dismiss submission" });
  }
});

// Creator cancels their own still-pending submission: deletes the staged file from
// Drive and marks the record CANCELLED. Scoped to their own creatorCode.
router.post("/submissions/:id/cancel", async (req, res) => {
  try {
    const { creatorCode } = req.body || {};
    if (!creatorCode) return res.status(400).json({ error: "creatorCode is required" });
    const normalizedCode = normalizeCreatorCode(creatorCode);

    const result = await cancelSubmission(req.params.id, normalizedCode);
    if (!result) {
      return res.status(400).json({ error: "Submission not found, not yours, or no longer pending" });
    }

    await deleteStagingFile(result.stagingFileId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error cancelling submission:", error);
    res.status(500).json({ error: error?.message || "Failed to cancel submission" });
  }
});

export default router;
