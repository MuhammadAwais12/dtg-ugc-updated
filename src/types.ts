export type DateRange = '7d' | '14d' | '30d' | '90d';

export interface AdMetric {
  adId: string;
  adName: string;
  channel: string;
  spend: number;
  convValue: number;
  orders: number;
  adImageUrl?: string;
  videoUrl?: string;
  // Computed fields (or calculated by frontend/backend)
  roas?: number;
  aov?: number;
  estCommission?: number;
}

export interface KpiMetrics {
  totalSpend: number;
  convValue: number;
  roas: number;
  aov: number;
  estCommission: number;
  totalOrders: number;
}

export interface CreatorUser {
  name: string;
  code: string;
}

export type SubmissionStatus = "PENDING" | "APPROVED" | "DENIED" | "CANCELLED";

export interface ContentSubmission {
  id: string;
  creatorCode: string;
  creatorName?: string | null;
  product: string;
  originalFileName: string;
  fileType: string;
  fileSize?: number | null;
  stagingFileId: string;
  stagingFolderId: string;
  status: SubmissionStatus;
  usageRightsAccepted: boolean;
  submittedAt: any;
  reviewedAt?: any;
  reviewedBy?: string | null;
  denialReason?: string | null;
  finalFileId?: string | null;
  finalFileName?: string | null;
  version?: number | null;
  dismissedByCreator?: boolean;
  adminComment?: string | null;
  adminCommentBy?: string | null;
  adminCommentAt?: any;
}
