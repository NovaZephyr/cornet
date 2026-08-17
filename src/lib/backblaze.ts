type B2Config = {
  endpoint: string;
  keyId: string;
  applicationKey: string;
  bucketId: string;
  bucketName: string;
  publicBaseUrl?: string;
};

function getConfig(): B2Config {
  const endpoint = process.env.B2_ENDPOINT;
  const keyId = process.env.B2_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;
  const bucketId = process.env.B2_BUCKET_ID;
  const bucketName = process.env.B2_BUCKET_NAME;
  if (!endpoint || !keyId || !applicationKey || !bucketId || !bucketName) {
    throw new Error("Backblaze B2 is not configured on the server");
  }
  return { endpoint, keyId, applicationKey, bucketId, bucketName, publicBaseUrl: process.env.B2_PUBLIC_BASE_URL };
}

export type B2UploadTicket = {
  uploadUrl: string;
  authorizationToken: string;
};

export function getBackblazeConfig() {
  return getConfig();
}

/**
 * Server-only adapter boundary for B2.
 * The actual authorization/upload calls belong in a server route so B2 keys
 * are never sent to the browser. This module intentionally contains no
 * client-side exports or secrets.
 */
export function buildB2DownloadUrl(fileName: string) {
  const config = getConfig();
  const encoded = fileName.split("/").map(encodeURIComponent).join("/");
  if (config.publicBaseUrl) return `${config.publicBaseUrl.replace(/\/$/, "")}/${encoded}`;
  return `${config.endpoint.replace(/\/$/, "")}/file/${encodeURIComponent(config.bucketName)}/${encoded}`;
}
