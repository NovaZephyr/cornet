const CLOUD_NAME = "dzoqpouj";
const UPLOAD_PRESET = "corenetwork_media";
const MAX_BYTES = 100 * 1024 * 1024;

export type CloudinaryResourceType = "image" | "video";

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
): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error("El archivo supera el límite de 100 MB.");
  if (resourceType === "video" && !file.type.startsWith("video/")) throw new Error("Selecciona un archivo de vídeo válido.");
  if (resourceType === "image" && !file.type.startsWith("image/")) throw new Error("Selecciona una imagen válida.");

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", UPLOAD_PRESET);
  body.append("context", `user_id=${userId}`);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, { method: "POST", body });
  const payload = (await response.json()) as { secure_url?: string; error?: { message?: string } };
  if (!response.ok || !payload.secure_url) throw new Error(payload.error?.message ?? "Cloudinary rechazó la subida.");

  return resourceType === "video" ? toPlayableCloudinaryVideoUrl(payload.secure_url) : payload.secure_url;
}
