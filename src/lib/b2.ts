import { supabase } from "@/integrations/supabase/client";

const FUNCTION_NAME = "b2-file-host";
const UPLOAD_PROXY = "b2-upload-proxy";

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
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Authentication required");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? supabase.supabaseUrl;
  if (!supabaseUrl) throw new Error("Supabase URL is not configured");

  const response = await fetch(`${supabaseUrl}/functions/v1/${UPLOAD_PROXY}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-file-key": key,
    },
    body: file,
  });

  let payload: B2Response | null = null;
  try {
    payload = (await response.json()) as B2Response;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error ?? `B2 upload failed (${response.status})`);
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
