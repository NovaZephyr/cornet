import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GetObjectCommand, S3Client } from "npm:@aws-sdk/client-s3@3.862.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.862.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const endpoint = Deno.env.get("B2_ENDPOINT");
const region = Deno.env.get("B2_REGION") ?? "us-east-005";
const accessKeyId = Deno.env.get("B2_KEY_ID");
const secretAccessKey = Deno.env.get("B2_APPLICATION_KEY");
const bucket = Deno.env.get("B2_BUCKET_NAME");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
function client() { if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) throw new Error("B2 no está configurado"); return new S3Client({ region, endpoint, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } }); }
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
function cleanName(value: unknown) { return typeof value === "string" ? value.replace(/[\r\n"]/g, "").slice(0, 180) : undefined; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  try {
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase no está configurado");
    const token = new URL(req.url).searchParams.get("token");
    if (!token || token.length < 20 || token.length > 100) return json({ error: "Enlace inválido" }, 400);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: file, error } = await admin.from("community_files").select("id,original_name,storage_path,mime_type,is_public,downloads").eq("share_token", token).maybeSingle();
    if (error) throw error;
    if (!file || !file.is_public) return json({ error: "Archivo no encontrado" }, 404);
    await admin.from("community_files").update({ downloads: Number(file.downloads ?? 0) + 1 }).eq("id", file.id);
    const name = cleanName(file.original_name);
    const command = new GetObjectCommand({ Bucket: bucket!, Key: file.storage_path, ...(name ? { ResponseContentDisposition: `attachment; filename=\"${name}\"` } : {}), ...(file.mime_type ? { ResponseContentType: file.mime_type } : {}) });
    const url = await getSignedUrl(client(), command, { expiresIn: 3600 });
    return Response.redirect(url, 302);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "No se pudo abrir el archivo" }, 500);
  }
});
