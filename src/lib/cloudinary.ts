const CLOUD_NAME = "dzoqpouj";
const UPLOAD_PRESET = "corenetwork_media";
const MAX_BYTES = 100 * 1024 * 1024;

export type CloudinaryResourceType = "image" | "video";

export async function uploadToCloudinary(
  file: File,
  userId: string,
  resourceType: CloudinaryResourceType,
): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("El archivo supera el límite de 100 MB.");
  }

  if (resourceType === "video" && !file.type.startsWith("video/")) {
    throw new Error("Selecciona un archivo de vídeo válido.");
  }

  if (resourceType === "image" && !file.type.startsWith("image/")) {
    throw new Error("Selecciona una imagen válida.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", UPLOAD_PRESET);
  body.append("context", `user_id=${userId}`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: "POST", body },
  );

  const payload = (await response.json()) as {
    secure_url?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message ?? "Cloudinary rechazó la subida.");
  }

  return payload.secure_url;
}
