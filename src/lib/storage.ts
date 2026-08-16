import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string | null>>();

const TTL = 60 * 60; // 1h

/** Paths are stored as "bucket/path/to/file". */
export async function getSignedUrl(fullPath?: string | null): Promise<string | null> {
  if (!fullPath) return null;
  const hit = cache.get(fullPath);
  if (hit && hit.expires > Date.now()) return hit.url;
  const existing = inflight.get(fullPath);
  if (existing) return existing;

  const slash = fullPath.indexOf("/");
  if (slash < 0) return null;
  const bucket = fullPath.slice(0, slash);
  const key = fullPath.slice(slash + 1);

  // Public media never needs a signed URL. Using getPublicUrl also avoids
  // noisy 400s when old database rows point at deleted media objects.
  if (bucket === "media") {
    const { data } = supabase.storage.from(bucket).getPublicUrl(key);
    return data.publicUrl || null;
  }

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
  const { error } = await supabase.storage.from(bucket).upload(key, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return `${bucket}/${key}`;
}
