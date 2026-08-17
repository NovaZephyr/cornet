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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  const allowedPrefixes = [`files/${userId}/`, `temp/${userId}/`, `community/${userId}/`];
  if (!allowedPrefixes.some((prefix) => value.startsWith(prefix))) throw new Error("You do not own this object");
  return value;
}

function cleanFilename(value: unknown) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\r\n"]/g, "").trim().slice(0, 180);
  return cleaned || undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const action = body?.action;
    const user = await currentUser(req);
    if (!user) return json({ error: "Authentication required" }, 401);
    const s3 = client();

    if (action === "health") {
      await s3.send(new HeadBucketCommand({ Bucket: bucket! }));
      return json({ ok: true, bucket });
    }

    const key = validKey(body?.key, user.id);

    if (action === "upload-url") {
      const contentType = typeof body?.contentType === "string" && body.contentType.length <= 255
        ? body.contentType
        : "application/octet-stream";
      const expiresIn = Math.min(Math.max(Number(body?.expiresIn ?? 900), 60), 3600);
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: bucket!, Key: key, ContentType: contentType }),
        { expiresIn },
      );
      return json({ url, key, expiresIn });
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
