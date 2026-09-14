import { Router } from "express";
import {
  verifyAdminCredentials,
  issueAdminSession,
  clearAdminSession,
  requireAdmin,
  AdminRequest,
} from "../adminAuth.js";
import {
  listAllSubmissions,
  getSubmission,
  updateSubmissionProduct,
  countApprovedByCreatorAndProduct,
  markApproved,
  markDenied,
  updateAdminComment,
  SubmissionStatus,
} from "../submissions.js";
import { approveAndMoveFile, deleteStagingFile } from "../driveUpload.js";
import { emitToCreator } from "../socket.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const valid = await verifyAdminCredentials(email, password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  issueAdminSession(res, email.trim().toLowerCase());
  res.json({ success: true, email: email.trim().toLowerCase() });
});

router.post("/logout", (req, res) => {
  clearAdminSession(res);
  res.json({ success: true });
});

router.get("/me", requireAdmin, (req: AdminRequest, res) => {
  res.json({ email: req.adminEmail });
});

router.get("/submissions", requireAdmin, async (req, res) => {
  try {
    const status = req.query.status as SubmissionStatus | undefined;
    const submissions = await listAllSubmissions(status);
    res.json({ submissions });
  } catch (error: any) {
    console.error("Error listing submissions:", error);
    res.status(500).json({ error: error?.message || "Failed to load submissions" });
  }
});

router.patch("/submissions/:id/product", requireAdmin, async (req, res) => {
  try {
    const { product } = req.body || {};
    if (!product) return res.status(400).json({ error: "product is required" });
    await updateSubmissionProduct(req.params.id, product);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: error?.message || "Failed to update product" });
  }
});

router.post("/submissions/:id/approve", requireAdmin, async (req: AdminRequest, res) => {
  try {
    const submission: any = await getSubmission(req.params.id);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (submission.status !== "PENDING") {
      return res.status(400).json({ error: `Submission is already ${submission.status}` });
    }

    const product = req.body?.product || submission.product;
    const version = (await countApprovedByCreatorAndProduct(submission.creatorCode, product)) + 1;

    const { finalFileId, finalFileName } = await approveAndMoveFile({
      fileId: submission.stagingFileId,
      stagingFolderId: submission.stagingFolderId,
      creatorCode: submission.creatorCode,
      product,
      originalFileName: submission.originalFileName,
      mimeType: submission.fileType,
      version,
    });

    if (product !== submission.product) {
      await updateSubmissionProduct(req.params.id, product);
    }
    await markApproved(req.params.id, req.adminEmail!, finalFileId, finalFileName, version);

    emitToCreator(submission.creatorCode, "submissionUpdate", {
      id: req.params.id,
      status: "APPROVED",
      product,
      finalFileName,
    });

    res.json({ success: true, finalFileId, finalFileName, version });
  } catch (error: any) {
    console.error("Error approving submission:", error);
    res.status(500).json({ error: error?.message || "Failed to approve submission" });
  }
});

router.post("/submissions/:id/deny", requireAdmin, async (req: AdminRequest, res) => {
  try {
    const { reason } = req.body || {};
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "A denial reason is required" });
    }
    const submission: any = await getSubmission(req.params.id);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (submission.status !== "PENDING") {
      return res.status(400).json({ error: `Submission is already ${submission.status}` });
    }

    // Delete from Drive staging first — only mark denied in Firestore if the
    // file is actually gone, so a failed deletion never gets silently reported as success.
    await deleteStagingFile(submission.stagingFileId);
    await markDenied(req.params.id, req.adminEmail!, reason.trim());

    emitToCreator(submission.creatorCode, "submissionUpdate", {
      id: req.params.id,
      status: "DENIED",
      product: submission.product,
      denialReason: reason.trim(),
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error denying submission:", error);
    res.status(500).json({ error: error?.message || "Failed to deny submission" });
  }
});

router.patch("/submissions/:id/comment", requireAdmin, async (req: AdminRequest, res) => {
  try {
    const { comment } = req.body || {};
    if (typeof comment !== "string" || !comment.trim()) {
      return res.status(400).json({ error: "comment is required" });
    }
    const submission: any = await getSubmission(req.params.id);
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    await updateAdminComment(req.params.id, req.adminEmail!, comment.trim());

    emitToCreator(submission.creatorCode, "submissionUpdate", {
      id: req.params.id,
      adminComment: comment.trim(),
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error saving comment:", error);
    res.status(500).json({ error: error?.message || "Failed to save comment" });
  }
});

export default router;
