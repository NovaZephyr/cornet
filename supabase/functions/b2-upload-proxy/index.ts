import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.862.0";

const endpoint = Deno.env.get("B2_ENDPOINT");
const region = Deno.env.get("B2_REGION") ?? "us-east-005";
const accessKeyId = Deno.env.get("B2_KEY_ID");
const secretAccessKey = Deno.env.get("B2_APPLICATION_KEY");
const bucket = Deno.env.get("B2_BUCKET_NAME");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-file-name, x-file-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function client() {
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) throw new Error("B2 is not configured");
  return new S3Client({ region, endpoint, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } });
}

function validKey(value: string, userId: string) {
  if (!value || value.startsWith("/") || value.includes("..") || value.length > 1024) throw new Error("Invalid object key");
  const prefixes = [`files/${userId}/`, `temp/${userId}/`, `community/${userId}/`];
  if (!prefixes.some((prefix) => value.startsWith(prefix))) throw new Error("You do not own this object");
  return value;
}

async function currentUser(req: Request) {
  if (!supabaseUrl || !anonKey) throw new Error("Supabase auth is not configured");
  const authorization = req.headers.get("Authorization");
  if (!authorization) return null;
  const auth = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: "Authentication required" }, 401);
    const key = validKey(req.headers.get("x-file-key") ?? "", user.id);
    const contentType = req.headers.get("content-type") || "application/octet-stream";
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength > 100 * 1024 * 1024) return json({ error: "File exceeds 100 MB proxy limit" }, 413);

    const result = await client().send(new PutObjectCommand({
      Bucket: bucket!,
      Key: key,
      Body: req.body ?? undefined,
      ContentType: contentType,
    }));

    return json({ ok: true, key, etag: result.ETag ?? null });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "B2 upload failed";
    const status = message === "Authentication required" ? 401 : message === "You do not own this object" ? 403 : message === "Invalid object key" ? 400 : 500;
    return json({ error: message }, status);
  }
});
