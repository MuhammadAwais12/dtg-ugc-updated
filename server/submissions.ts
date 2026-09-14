import { db } from "./firebase.js";
import { FieldValue } from "firebase-admin/firestore";

export type SubmissionStatus = "PENDING" | "APPROVED" | "DENIED" | "CANCELLED";

export interface ContentSubmissionInput {
  creatorCode: string;
  creatorName?: string;
  product: string;
  originalFileName: string;
  fileType: string;
  fileSize?: number;
  stagingFileId: string;
  stagingFolderId: string;
  usageRightsAccepted: boolean;
}

const COLLECTION = "contentSubmissions";

export async function createSubmission(input: ContentSubmissionInput) {
  if (!input.usageRightsAccepted) {
    throw new Error("Usage rights must be accepted to submit content");
  }
  const doc = {
    creatorCode: input.creatorCode,
    creatorName: input.creatorName || null,
    product: input.product,
    originalFileName: input.originalFileName,
    fileType: input.fileType,
    fileSize: input.fileSize || null,
    stagingFileId: input.stagingFileId,
    stagingFolderId: input.stagingFolderId,
    status: "PENDING" as SubmissionStatus,
    usageRightsAccepted: true,
    usageRightsAcceptedAt: FieldValue.serverTimestamp(),
    submittedAt: FieldValue.serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
    denialReason: null,
    finalFileId: null,
    finalFileName: null,
    version: null,
    dismissedByCreator: false,
    adminComment: null,
    adminCommentBy: null,
    adminCommentAt: null,
  };
  const ref = await db.collection(COLLECTION).add(doc);
  return { id: ref.id, ...doc };
}

// Excludes submissions the creator has already dismissed from their dashboard.
export async function listSubmissionsForCreator(creatorCode: string) {
  const snap = await db
    .collection(COLLECTION)
    .where("creatorCode", "==", creatorCode)
    .orderBy("submittedAt", "desc")
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s: any) => s.dismissedByCreator !== true);
}

export async function listAllSubmissions(status?: SubmissionStatus) {
  let query: FirebaseFirestore.Query = db.collection(COLLECTION);
  if (status) query = query.where("status", "==", status);
  const snap = await query.orderBy("submittedAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getSubmission(id: string) {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function updateSubmissionProduct(id: string, product: string) {
  await db.collection(COLLECTION).doc(id).update({ product });
}

export async function countApprovedByCreatorAndProduct(
  creatorCode: string,
  product: string
): Promise<number> {
  const snap = await db
    .collection(COLLECTION)
    .where("creatorCode", "==", creatorCode)
    .where("product", "==", product)
    .where("status", "==", "APPROVED")
    .get();
  return snap.size;
}

export async function markApproved(
  id: string,
  adminEmail: string,
  finalFileId: string,
  finalFileName: string,
  version: number
) {
  await db.collection(COLLECTION).doc(id).update({
    status: "APPROVED",
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: adminEmail,
    finalFileId,
    finalFileName,
    version,
  });
}

export async function markDenied(id: string, adminEmail: string, reason: string) {
  await db.collection(COLLECTION).doc(id).update({
    status: "DENIED",
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: adminEmail,
    denialReason: reason,
  });
}

// Admin feedback for the creator (e.g. "replicate this with a new hook"). Usable on
// any submission regardless of status — including already-approved ones.
export async function updateAdminComment(id: string, adminEmail: string, comment: string) {
  await db.collection(COLLECTION).doc(id).update({
    adminComment: comment,
    adminCommentBy: adminEmail,
    adminCommentAt: FieldValue.serverTimestamp(),
  });
}

// Creator has viewed the approval/denial/cancellation and wants it off their dashboard.
// Only allowed for resolved submissions, and scoped to that creator's own code.
export async function dismissSubmission(id: string, creatorCode: string): Promise<boolean> {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return false;
  const data = doc.data() as any;
  if (data.creatorCode !== creatorCode) return false;
  if (data.status === "PENDING") return false;
  await doc.ref.update({ dismissedByCreator: true });
  return true;
}

// Creator cancels their own still-pending submission. Returns the staging file id
// (so the caller can delete it from Drive) or null if not allowed/found.
export async function cancelSubmission(id: string, creatorCode: string): Promise<{ stagingFileId: string } | null> {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data() as any;
  if (data.creatorCode !== creatorCode) return null;
  if (data.status !== "PENDING") return null;
  await doc.ref.update({
    status: "CANCELLED",
    reviewedAt: FieldValue.serverTimestamp(),
  });
  return { stagingFileId: data.stagingFileId };
}
