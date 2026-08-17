import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { S3Client, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "npm:@aws-sdk/client-s3@3.862.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.862.0";

const endpoint = Deno.env.get("B2_ENDPOINT");
const region = Deno.env.get("B2_REGION") ?? "us-east-005";
const accessKeyId = Deno.env.get("B2_KEY_ID");
const secretAccessKey = Deno.env.get("B2_APPLICATION_KEY");
const bucket = Deno.env.get("B2_BUCKET_NAME");

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const action = body?.action;
    const key = typeof body?.key === "string" ? body.key : "";
    if (!action) return json({ error: "Missing action" }, 400);

    const s3 = client();

    if (action === "health") {
      await s3.send(new HeadBucketCommand({ Bucket: bucket! }));
      return json({ ok: true, bucket });
    }

    if (!key || key.includes("..") || key.startsWith("/") || key.length > 1024) {
      return json({ error: "Invalid object key" }, 400);
    }

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
      const filename = typeof body?.filename === "string"
        ? body.filename.replace(/[\r\n"]/g, "").slice(0, 180)
        : undefined;
      const command = new GetObjectCommand({
        Bucket: bucket!,
        Key: key,
        ...(filename ? { ResponseContentDisposition: `attachment; filename="${filename}"` } : {}),
      });
      const url = await getSignedUrl(s3, command, { expiresIn });
      return json({ url, key, expiresIn });
    }

    if (action === "delete") {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket!, Key: key }));
      return json({ ok: true, key });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "B2 request failed" }, 500);
  }
});
