import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { getMetrics } from "./northbeam.js";
import { db } from "./firebase.js";
import { testGoogleDriveAccess } from "./googleDrive.js";
import creatorUploadRouter from "./routes/creatorUpload.js";
import adminRouter from "./routes/admin.js";
import creatorAuthRouter from "./routes/creatorAuth.js";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/creator", creatorUploadRouter);
app.use("/api/admin", adminRouter);
app.use("/api/creator-auth", creatorAuthRouter);

function maskSecret(val?: string): string {
  if (!val) return "(not set)";
  if (val.length <= 8) return `${val.slice(0, 2)}...${val.slice(-2)}`;
  return `${val.slice(0, 4)}...${val.slice(-4)}`;
}

export async function testNorthbeamCredentials() {
  const apiKey = process.env.NORTHBEAM_API_KEY;
  const clientId = process.env.NORTHBEAM_CLIENT_ID;

  const targetUrl = "https://api.northbeam.io/v1/exports/attribution-models";

  console.log("==================================================");
  console.log("[NORTHBEAM CREDENTIALS CHECK]");
  console.log(`process.env.NORTHBEAM_API_KEY  : ${maskSecret(apiKey)}`);
  console.log(`process.env.NORTHBEAM_CLIENT_ID: ${maskSecret(clientId)}`);
  console.log(`[EXACT REQUEST URL STRING]      : "${targetUrl}" (length: ${targetUrl.length})`);

  if (!apiKey || !clientId) {
    console.warn("[NORTHBEAM TEST CALL] Skipped: NORTHBEAM_API_KEY or NORTHBEAM_CLIENT_ID is missing in process.env.");
    console.log("==================================================");
    return { status: null, body: "Missing env vars" };
  }

  const headers = {
    "Authorization": apiKey,
    "Data-Client-ID": clientId,
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  const maskedHeaders = {
    "Authorization": maskSecret(apiKey),
    "Data-Client-ID": maskSecret(clientId),
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  };

  console.log("[NORTHBEAM REQUEST HEADERS]   :", JSON.stringify(maskedHeaders, null, 2));

  try {
    console.log(`[NORTHBEAM TEST CALL] Sending GET request to "${targetUrl}" ...`);
    const response = await fetch(targetUrl, {
      method: "GET",
      headers,
    });

    const rawText = await response.text();
    console.log(`[NORTHBEAM TEST CALL] HTTP Status: ${response.status} ${response.statusText}`);
    console.log(`[NORTHBEAM TEST CALL] Raw Response:\n${rawText}`);
    console.log("==================================================");
    return {
      exactUrl: targetUrl,
      headersSentMasked: maskedHeaders,
      status: response.status,
      statusText: response.statusText,
      body: rawText,
    };
  } catch (err: any) {
    console.error("[NORTHBEAM TEST CALL] Fetch Error:", err);
    console.log("==================================================");
    return {
      exactUrl: targetUrl,
      headersSentMasked: maskedHeaders,
      status: 500,
      error: err?.message,
    };
  }
}

// Test route to manually trigger credential verification & attribution-models fetch
app.get("/api/northbeam/test-credentials", async (req, res) => {
  const result = await testNorthbeamCredentials();
  res.json({
    apiKeyMasked: maskSecret(process.env.NORTHBEAM_API_KEY),
    clientIdMasked: maskSecret(process.env.NORTHBEAM_CLIENT_ID),
    testCallResult: result,
  });
});

// 2. Route to fetch creator metrics filtered by date range and code (dashboard data — unchanged)
app.get(["/api/northbeam/metrics", "/api/metrics"], async (req, res) => {
  // Edge/CDN response caching header for Vercel and downstream proxies
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  try {
    const dateRange = (req.query.dateRange as string) || "7d";
    const creatorCode = (req.query.creatorCode as string) || "";
    const data = await getMetrics(creatorCode, dateRange);
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/northbeam/metrics:", error);
    const msg = error?.message || "Failed to fetch metrics";
    const isTimeout = msg.toLowerCase().includes("longer than usual") || msg.toLowerCase().includes("timed out");
    res.status(isTimeout ? 504 : 500).json({
      error: isTimeout ? "Northbeam is taking longer than usual to respond, please try again" : msg,
      retryable: true,
    });
  }
});

// firebase route for testing 
app.get("/api/firebase/test", async (req, res) => {
  try {
    await db.collection("contentSubmissions").limit(1).get();

    res.json({
      success: true,
      message: "Firebase Firestore connection is working",
    });
  } catch (error: any) {
    console.error("Firebase connection test failed:", error);

    res.status(500).json({
      success: false,
      error: error?.message || "Firebase connection failed",
    });
  }
});

// firebase route for submission testing 

app.post("/api/content/test-submission", async (req, res) => {
  try {
    const submission = {
      creatorCode: "CR-134",
      product: "Test Product",

      originalFileName: "test-video.mp4",
      fileType: "video/mp4",

      stagingFileId: null,

      status: "PENDING",

      usageRightsAccepted: true,
      usageRightsAcceptedAt: new Date(),

      submittedAt: new Date(),

      reviewedAt: null,
      reviewedBy: null,

      denialReason: null,

      finalFileId: null,
      finalFileName: null,
      version: null,
    };

    const docRef = await db
      .collection("contentSubmissions")
      .add(submission);

    res.status(201).json({
      success: true,
      submissionId: docRef.id,
      submission,
    });
  } catch (error: any) {
    console.error("Failed to create test submission:", error);

    res.status(500).json({
      success: false,
      error: error?.message || "Failed to create submission",
    });
  }
});
// googledrive 
app.get("/api/drive/test", async (req, res) => {
  try {
    const folder = await testGoogleDriveAccess();

    res.json({
      success: true,
      folder,
    });
  } catch (error: any) {
    console.error("Google Drive access test failed:", error);

    res.status(500).json({
      success: false,
      error: error?.message || "Google Drive access test failed",
    });
  }
});
export default app;
