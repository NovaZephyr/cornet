import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "npm:@aws-sdk/client-s3@3.862.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const b2Endpoint = Deno.env.get("B2_ENDPOINT");
const b2Region = Deno.env.get("B2_REGION") ?? "us-east-005";
const b2KeyId = Deno.env.get("B2_KEY_ID");
const b2ApplicationKey = Deno.env.get("B2_APPLICATION_KEY");
const b2Bucket = Deno.env.get("B2_BUCKET_NAME");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-migration-token",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function adminClient() {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service configuration is missing");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function b2Client() {
  if (!b2Endpoint || !b2KeyId || !b2ApplicationKey || !b2Bucket) throw new Error("B2 configuration is missing");
  return new S3Client({
    region: b2Region,
    endpoint: b2Endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: b2KeyId, secretAccessKey: b2ApplicationKey },
  });
}

function safeLeaf(value: string) {
  const leaf = value.split("/").pop() ?? "file.bin";
  return leaf.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180) || "file.bin";
}

async function authorized(admin: ReturnType<typeof adminClient>, token: string | null) {
  if (!token) return false;
  const { data, error } = await admin
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    .eq("name", "corenetwork-video-migration-token")
    .maybeSingle();
  if (error || !data?.decrypted_secret) return false;
  return token === data.decrypted_secret;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const admin = adminClient();
    if (!(await authorized(admin, req.headers.get("x-migration-token")))) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit ?? 2), 1), 5);
    const { data: rows, error } = await admin
      .from("videos")
      .select("id,user_id,video_path,video_storage_provider,video_storage_key")
      .neq("video_storage_provider", "backblaze")
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;

    const s3 = b2Client();
    const results: Array<Record<string, unknown>> = [];

    for (const row of rows ?? []) {
      try {
        const source = String(row.video_path ?? "");
        const provider = String(row.video_storage_provider ?? "supabase");
        let bodyBytes: Uint8Array;
        let contentType = "application/octet-stream";

        if (provider === "supabase") {
          const key = String(row.video_storage_key ?? source).replace(/^videos\//, "");
          const { data: blob, error: downloadError } = await admin.storage.from("videos").download(key);
          if (downloadError || !blob) throw downloadError ?? new Error("Could not download source from Supabase Storage");
          bodyBytes = new Uint8Array(await blob.arrayBuffer());
          contentType = blob.type || contentType;
        } else {
          const response = await fetch(source);
          if (!response.ok) throw new Error(`Source download failed: ${response.status}`);
          bodyBytes = new Uint8Array(await response.arrayBuffer());
          contentType = response.headers.get("content-type") || contentType;
        }

        const sourceName = source.startsWith("http") ? source : String(row.video_storage_key ?? source);
        const key = `videos/${row.user_id}/${row.id}-${safeLeaf(sourceName)}`;

        try {
          await s3.send(new HeadObjectCommand({ Bucket: b2Bucket!, Key: key }));
        } catch {
          await s3.send(new PutObjectCommand({
            Bucket: b2Bucket!,
            Key: key,
            Body: bodyBytes,
            ContentType: contentType,
          }));
        }

        const { error: updateError } = await admin
          .from("videos")
          .update({
            video_path: `b2/${key}`,
            video_storage_provider: "backblaze",
            video_storage_key: key,
          })
          .eq("id", row.id);
        if (updateError) throw updateError;

        results.push({ id: row.id, status: "migrated", key, bytes: bodyBytes.byteLength });
      } catch (itemError) {
        results.push({
          id: row.id,
          status: "error",
          error: itemError instanceof Error ? itemError.message : "Migration failed",
        });
      }
    }

    const { count } = await admin
      .from("videos")
      .select("id", { count: "exact", head: true })
      .neq("video_storage_provider", "backblaze");

    return json({ ok: true, processed: results.length, remaining: count ?? 0, results });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Migration failed" }, 500);
  }
});
