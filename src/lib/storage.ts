import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toPlayableCloudinaryVideoUrl } from "@/lib/cloudinary";
import { createB2DownloadUrl, uploadToB2 } from "@/lib/b2";

const cache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string | null>>();

const TTL = 60 * 60;
const IMMUTABLE_CACHE_CONTROL = "31536000";
const STORAGE_PROVIDER = String(import.meta.env.VITE_STORAGE_PROVIDER ?? "supabase").toLowerCase();

/** Paths are stored as "bucket/path/to/file", "b2/path/to/file", or external HTTPS URLs. */
export async function getSignedUrl(fullPath?: string | null): Promise<string | null> {
  if (!fullPath) return null;
  if (/^https?:\/\//i.test(fullPath)) {
    return /\/video\/upload\//i.test(fullPath) ? toPlayableCloudinaryVideoUrl(fullPath) : fullPath;
  }

  const slash = fullPath.indexOf("/");
  if (slash < 0) return null;
  const bucket = fullPath.slice(0, slash);
  const key = fullPath.slice(slash + 1);

  if (bucket === "b2") {
    const hit = cache.get(fullPath);
    if (hit && hit.expires > Date.now()) return hit.url;
    const existing = inflight.get(fullPath);
    if (existing) return existing;
    const promise = createB2DownloadUrl(key, undefined, TTL).then(({ url }) => {
      cache.set(fullPath, { url, expires: Date.now() + (TTL - 60) * 1000 });
      inflight.delete(fullPath);
      return url;
    }).catch(() => {
      inflight.delete(fullPath);
      return null;
    });
    inflight.set(fullPath, promise);
    return promise;
  }

  if (bucket === "media") {
    const { data } = supabase.storage.from("media").getPublicUrl(key);
    return data.publicUrl || null;
  }

  const hit = cache.get(fullPath);
  if (hit && hit.expires > Date.now()) return hit.url;
  const existing = inflight.get(fullPath);
  if (existing) return existing;

  const promise = supabase.storage
    .from(bucket)
    .createSignedUrl(key, TTL)
    .then(({ data }) => {
      const url = data?.signedUrl ?? null;
      if (url) cache.set(fullPath, { url, expires: Date.now() + (TTL - 60) * 1000 });
      inflight.delete(fullPath);
      return url;
    })
    .catch(() => {
      inflight.delete(fullPath);
      return null;
    });

  inflight.set(fullPath, promise);
  return promise;
}

export function useSignedUrl(fullPath?: string | null) {
  const [url, setUrl] = useState<string | null>(() => {
    if (!fullPath) return null;
    if (/^https?:\/\//i.test(fullPath)) return /\/video\/upload\//i.test(fullPath) ? toPlayableCloudinaryVideoUrl(fullPath) : fullPath;
    if (fullPath.startsWith("media/")) {
      const key = fullPath.slice("media/".length);
      return supabase.storage.from("media").getPublicUrl(key).data.publicUrl || null;
    }
    const hit = cache.get(fullPath);
    return hit && hit.expires > Date.now() ? hit.url : null;
  });

  useEffect(() => {
    let active = true;
    if (!fullPath) {
      setUrl(null);
      return;
    }
    getSignedUrl(fullPath).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [fullPath]);

  return url;
}

export async function uploadFile(
  bucket: "videos" | "media",
  userId: string,
  file: File,
  prefix = "",
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const key = `${userId}/${prefix}${crypto.randomUUID()}.${ext}`;

  if (STORAGE_PROVIDER === "b2") {
    await uploadToB2(key, file);
    return `b2/${key}`;
  }

  const { error } = await supabase.storage.from(bucket).upload(key, file, {
    cacheControl: IMMUTABLE_CACHE_CONTROL,
    upsert: false,
  });
  if (error) throw error;
  return `${bucket}/${key}`;
}
