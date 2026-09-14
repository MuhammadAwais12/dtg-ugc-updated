import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({
  version: "v3",
  auth,
});

export async function testGoogleDriveAccess() {
  const folderId = process.env.GOOGLE_DRIVE_STAGING_FOLDER_ID;

  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_STAGING_FOLDER_ID is not configured");
  }

  const response = await drive.files.get({
    fileId: folderId,
    fields: "id,name,mimeType",
    supportsAllDrives: true,
  });

  return response.data;
}

export { auth, drive };
