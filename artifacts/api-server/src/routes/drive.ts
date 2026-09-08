import { Router, type IRouter } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

const router: IRouter = Router();
const FOLDER_MIME = "application/vnd.google-apps.folder";
const TEMP_FOLDER_NAME = "Classroom Capture Temporary";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
};

function drive() {
  return new ReplitConnectors();
}

async function readDriveResponse(response: Response) {
  const text = await response.text();
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: text };
  }
  return { body, text };
}

router.get("/drive/folders", async (req, res) => {
  try {
    const query = encodeURIComponent(
      `mimeType = '${FOLDER_MIME}' and trashed = false`,
    );
    const response = await drive().proxy(
      "google-drive",
      `/drive/v3/files?q=${query}&spaces=drive&pageSize=100&orderBy=name&fields=files(id,name,mimeType,modifiedTime,webViewLink)`,
      { method: "GET" },
    );
    const { body } = await readDriveResponse(response);
    if (!response.ok) {
      req.log.error({ status: response.status, body }, "Google Drive folder list failed");
      return res.status(response.status).json({ message: "Unable to load Google Drive folders." });
    }
    return res.json({ folders: (body as { files?: DriveFile[] }).files ?? [] });
  } catch (error) {
    req.log.error({ err: error }, "Google Drive folder list failed");
    return res.status(502).json({ message: "Google Drive is unavailable right now." });
  }
});

router.post("/drive/temp-folder", async (req, res) => {
  try {
    const query = encodeURIComponent(
      `name = '${TEMP_FOLDER_NAME}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    );
    const existing = await drive().proxy(
      "google-drive",
      `/drive/v3/files?q=${query}&spaces=drive&pageSize=10&fields=files(id,name,mimeType)`,
      { method: "GET" },
    );
    const existingData = await readDriveResponse(existing);
    if (!existing.ok) {
      req.log.error({ status: existing.status, body: existingData.body }, "Google Drive temp folder lookup failed");
      return res.status(existing.status).json({ message: "Unable to prepare your temporary Drive folder." });
    }

    const match = (existingData.body as { files?: DriveFile[] }).files?.[0];
    if (match?.id) return res.json({ folder: match });

    const created = await drive().proxy("google-drive", "/drive/v3/files?fields=id,name,mimeType", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: TEMP_FOLDER_NAME, mimeType: FOLDER_MIME }),
    });
    const createdData = await readDriveResponse(created);
    if (!created.ok) {
      req.log.error({ status: created.status, body: createdData.body }, "Google Drive temp folder creation failed");
      return res.status(created.status).json({ message: "Unable to create your temporary Drive folder." });
    }
    return res.json({ folder: createdData.body });
  } catch (error) {
    req.log.error({ err: error }, "Google Drive temp folder operation failed");
    return res.status(502).json({ message: "Google Drive is unavailable right now." });
  }
});

router.post("/drive/upload", async (req, res) => {
  const { base64, filename, folderId, caption } = req.body as {
    base64?: string;
    filename?: string;
    folderId?: string;
    caption?: string;
  };

  if (!base64 || !filename || !folderId) {
    return res.status(400).json({ message: "A photo, filename, and destination folder are required." });
  }

  try {
    const boundary = `classroom_capture_${Date.now().toString(36)}`;
    const metadata = JSON.stringify({
      name: filename.replace(/[^a-zA-Z0-9._-]/g, "_"),
      parents: [folderId],
      description: caption?.trim() || "Captured with Classroom Capture",
    });
    const image = Buffer.from(base64, "base64");
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`),
      image,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const response = await drive().proxy(
      "google-drive",
      "/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,parents,webViewLink",
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      },
    );
    const data = await readDriveResponse(response);
    if (!response.ok) {
      req.log.error({ status: response.status, body: data.body }, "Google Drive photo upload failed");
      return res.status(response.status).json({ message: "This photo could not be uploaded to Google Drive." });
    }
    return res.json({ file: data.body });
  } catch (error) {
    req.log.error({ err: error }, "Google Drive photo upload failed");
    return res.status(502).json({ message: "Google Drive is unavailable right now." });
  }
});

export default router;