import { supabase } from "@/integrations/supabase/client";

const FUNCTION_NAME = "b2-file-host";

type B2Response<T = Record<string, unknown>> = T & { error?: string };

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<B2Response<T>>(FUNCTION_NAME, { body });
  if (error) throw error;
  if (!data || data.error) throw new Error(data?.error ?? "B2 request failed");
  return data as T;
}

export async function createB2UploadUrl(key: string, contentType: string) {
  return invoke<{ url: string; key: string; expiresIn: number }>({
    action: "upload-url",
    key,
    contentType,
    expiresIn: 900,
  });
}

export async function uploadToB2(key: string, file: File) {
  const signed = await createB2UploadUrl(key, file.type || "application/octet-stream");
  const response = await fetch(signed.url, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!response.ok) {
    throw new Error(`B2 upload failed (${response.status})`);
  }
}

export async function createB2DownloadUrl(key: string, filename?: string, expiresIn = 3600) {
  return invoke<{ url: string; key: string; expiresIn: number; size?: number; contentType?: string | null }>({
    action: "download-url",
    key,
    filename,
    expiresIn,
  });
}

export async function deleteFromB2(key: string) {
  return invoke<{ ok: boolean; key: string }>({ action: "delete", key });
}
