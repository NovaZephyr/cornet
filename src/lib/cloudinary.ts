import { createCloudinaryUploadSignature } from "@/lib/admin.functions";

const CLOUD_NAME = "dzoqpouj";
const UPLOAD_PRESET = "corenetwork_media";
const MAX_BYTES = 100 * 1024 * 1024;

export type CloudinaryResourceType = "image" | "video";
export type CloudinaryUploadOptions = { publicId?: string; overwrite?: boolean };

const VIDEO_EXTENSIONS = new Set([
  ".mp4", ".m4v", ".mov", ".webm", ".mkv", ".avi", ".wmv", ".flv", ".mpeg", ".mpg", ".3gp", ".ts", ".m2ts",
]);
const VIDEO_MIME_PREFIXES = ["video/"];

function hasVideoExtension(file: File) {
  const name = file.name.toLowerCase().split("?")[0];
  const dot = name.lastIndexOf(".");
  return dot >= 0 && VIDEO_EXTENSIONS.has(name.slice(dot));
}

function assertValidMediaFile(file: File, resourceType: CloudinaryResourceType) {
  if (!(file instanceof File)) throw new Error("Selecciona un archivo válido.");
  if (file.size <= 0) throw new Error("El archivo está vacío.");
  if (file.size > MAX_BYTES) throw new Error("El archivo supera el límite de 100 MB.");

  if (resourceType === "video") {
    const mimeOk = VIDEO_MIME_PREFIXES.some((prefix) => file.type.toLowerCase().startsWith(prefix));
    const extensionOk = hasVideoExtension(file);
    if (!mimeOk || !extensionOk) {
      throw new Error("Solo se admiten archivos de vídeo. Usa MP4, WebM, MOV, MKV, AVI u otro formato de vídeo compatible.");
    }
  }

  if (resourceType === "image" && !file.type.toLowerCase().startsWith("image/")) {
    throw new Error("Selecciona una imagen válida.");
  }
}

/** Return a browser-friendly MP4/H.264/AAC delivery URL for a Cloudinary video. */
export function toPlayableCloudinaryVideoUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const marker = "/video/upload/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (parsed.hostname !== "res.cloudinary.com" || markerIndex < 0) return url;

    const prefix = parsed.pathname.slice(0, markerIndex + marker.length);
    const assetPath = parsed.pathname.slice(markerIndex + marker.length);
    const parts = assetPath.split("/");
    const last = parts.pop() ?? "";
    const extensionIndex = last.lastIndexOf(".");
    const baseName = extensionIndex > 0 ? last.slice(0, extensionIndex) : last;
    parts.push(`${baseName}.mp4`);
    parsed.pathname = `${prefix}f_mp4,vc_h264,ac_aac,q_auto/${parts.join("/")}`;
    return parsed.toString();
  } catch {
    return url;
  }
}

export async function uploadToCloudinary(
  file: File,
  userId: string,
  resourceType: CloudinaryResourceType,
  options: CloudinaryUploadOptions = {},
): Promise<string> {
  assertValidMediaFile(file, resourceType);

  if (options.publicId) {
    const signed = await createCloudinaryUploadSignature({
      data: { publicId: options.publicId, resourceType },
    });
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", signed.apiKey);
    body.append("timestamp", String(signed.timestamp));
    body.append("signature", signed.signature);
    body.append("public_id", signed.publicId);
    body.append("context", signed.context);
    body.append("overwrite", String(options.overwrite ?? true));
    body.append("invalidate", "true");

    const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/${resourceType}/upload`, { method: "POST", body });
    const payload = (await response.json()) as { secure_url?: string; error?: { message?: string } };
    if (!response.ok || !payload.secure_url) throw new Error(payload.error?.message ?? "Cloudinary rechazó la subida firmada.");
    return resourceType === "video" ? toPlayableCloudinaryVideoUrl(payload.secure_url) : payload.secure_url;
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", UPLOAD_PRESET);
  body.append("context", `user_id=${userId}`);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, { method: "POST", body });
  const payload = (await response.json()) as { secure_url?: string; error?: { message?: string } };
  if (!response.ok || !payload.secure_url) throw new Error(payload.error?.message ?? "Cloudinary rechazó la subida.");

  return resourceType === "video" ? toPlayableCloudinaryVideoUrl(payload.secure_url) : payload.secure_url;
}
