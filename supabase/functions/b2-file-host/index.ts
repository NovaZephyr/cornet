import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "npm:@aws-sdk/client-s3@3.862.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.862.0";

const endpoint = Deno.env.get("B2_ENDPOINT");
const region = Deno.env.get("B2_REGION") ?? "us-east-005";
const accessKeyId = Deno.env.get("B2_KEY_ID");
const secretAccessKey = Deno.env.get("B2_APPLICATION_KEY");
const bucket = Deno.env.get("B2_BUCKET_NAME");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-file-key, x-file-size, x-b2-action",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function client() {
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("B2 is not configured");
  }
  return new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function currentUser(req: Request) {
  if (!supabaseUrl || !anonKey) throw new Error("Supabase auth is not configured");
  const authorization = req.headers.get("Authorization");
  if (!authorization) return null;
  const auth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await auth.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

function validKey(value: unknown, userId: string) {
  if (typeof value !== "string" || !value || value.startsWith("/") || value.includes("..") || value.length > 1024) {
    throw new Error("Invalid object key");
  }
  const allowedPrefixes = [
    `videos/${userId}/`,
    `files/${userId}/`,
    `temp/${userId}/`,
    `community/${userId}/`,
  ];
  if (!allowedPrefixes.some((prefix) => value.startsWith(prefix))) throw new Error("You do not own this object");
  return value;
}

function cleanFilename(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\r\n"]/g, "").trim().slice(0, 180);
  return cleaned || undefined;
}

function uploadLimits(key: string) {
  if (key.startsWith("videos/")) return { maxBytes: 100 * 1024 * 1024, typePrefix: "video/" };
  if (key.startsWith("temp/")) return { maxBytes: 100 * 1024 * 1024, typePrefix: null };
  if (key.startsWith("files/") || key.startsWith("community/")) return { maxBytes: 50 * 1024 * 1024, typePrefix: null };
  throw new Error("Uploads are not allowed for this object path");
}

const BLOCKED_EXTENSIONS = new Set(["exe", "dll", "com", "scr", "msi", "bat", "cmd", "ps1", "vbs", "js", "jar", "sh"]);
const BLOCKED_MIME_TYPES = new Set([
  "application/x-msdownload", "application/x-dosexec", "application/x-executable",
  "application/x-sh", "application/x-shellscript", "application/x-bat",
  "application/x-msi", "application/java-archive", "text/javascript",
  "application/javascript", "application/x-httpd-php",
]);

function validateFileType(key: string, contentType: string) {
  const filename = key.slice(key.lastIndexOf("/") + 1);
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  if (BLOCKED_EXTENSIONS.has(extension) || BLOCKED_MIME_TYPES.has(contentType)) {
    throw new Error("This file type is not allowed");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: "Authentication required" }, 401);
    const s3 = client();

    if (req.headers.get("x-b2-action") === "upload") {
      const key = validKey(req.headers.get("x-file-key"), user.id);
      const { maxBytes, typePrefix } = uploadLimits(key);
      const size = Number(req.headers.get("x-file-size"));
      const contentType = (req.headers.get("content-type") || "application/octet-stream").trim().toLowerCase();
      if (!Number.isSafeInteger(size) || size <= 0 || size > maxBytes) {
        return json({ error: `File size must be between 1 byte and ${maxBytes} bytes` }, 400);
      }
      if (typePrefix && !contentType.startsWith(typePrefix)) {
        return json({ error: "Invalid content type for this upload path" }, 400);
      }
      validateFileType(key, contentType);
      if (!req.body) return json({ error: "Upload body is missing" }, 400);

      let received = 0;
      const boundedBody = req.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          received += chunk.byteLength;
          if (received > size || received > maxBytes) {
            controller.error(new Error("Upload exceeded its declared size"));
            return;
          }
          controller.enqueue(chunk);
        },
        flush() {
          if (received !== size) throw new Error("Upload size did not match its declaration");
        },
      }));

      await s3.send(new PutObjectCommand({
        Bucket: bucket!,
        Key: key,
        Body: boundedBody,
        ContentLength: size,
        ContentType: contentType,
      }));
      return json({ ok: true, key, size });
    }

    const body = await req.json();
    const action = body?.action;

    if (action === "health") {
      await s3.send(new HeadBucketCommand({ Bucket: bucket! }));
      return json({ ok: true, bucket });
    }

    const key = validKey(body?.key, user.id);

    if (action === "upload-url") {
      const { maxBytes, typePrefix } = uploadLimits(key);
      const size = Number(body?.size);
      if (!Number.isSafeInteger(size) || size <= 0 || size > maxBytes) {
        return json({ error: `File size must be between 1 byte and ${maxBytes} bytes` }, 400);
      }
      const contentType = typeof body?.contentType === "string" && body.contentType.length <= 255
        ? body.contentType.trim().toLowerCase()
        : "application/octet-stream";
      if (!contentType || (typePrefix && !contentType.startsWith(typePrefix))) {
        return json({ error: "Invalid content type for this upload path" }, 400);
      }
      return json({ error: "Direct upload URLs are disabled; use the size-limited upload request." }, 410);
    }

    if (action === "download-url") {
      const expiresIn = Math.min(Math.max(Number(body?.expiresIn ?? 900), 60), 3600);
      if (supabaseUrl && serviceRoleKey) {
        const admin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: record } = await admin
          .from("community_files")
          .select("share_token,is_public")
          .eq("user_id", user.id)
          .eq("storage_path", key)
          .maybeSingle();
        if (record?.share_token && record.is_public) {
          return json({
            url: `${supabaseUrl}/functions/v1/b2-public-download?token=${encodeURIComponent(record.share_token)}`,
            key,
            expiresIn: 0,
            stable: true,
          });
        }
      }
      const filename = cleanFilename(body?.filename);
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket!, Key: key }));
      const command = new GetObjectCommand({
        Bucket: bucket!,
        Key: key,
        ...(filename ? { ResponseContentDisposition: `attachment; filename=\"${filename}\"` } : {}),
        ...(head.ContentType ? { ResponseContentType: head.ContentType } : {}),
      });
      const url = await getSignedUrl(s3, command, { expiresIn });
      return json({
        url,
        key,
        expiresIn,
        size: head.ContentLength ?? 0,
        contentType: head.ContentType ?? null,
        stable: false,
      });
    }

    if (action === "delete") {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket!, Key: key }));
      return json({ ok: true, key });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "B2 request failed";
    const status = message === "Authentication required" ? 401 : message === "You do not own this object" ? 403 : 500;
    return json({ error: message }, status);
  }
});
