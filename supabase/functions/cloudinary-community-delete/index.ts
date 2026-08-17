import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

async function sha1(input: string) {
  const buffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No autorizado");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autorizado");

    const { table, id } = await req.json();
    if (table !== "community_files" && table !== "community_temp_files") throw new Error("Recurso inválido.");

    const { data: row, error: rowError } = await supabase.from(table).select("id,user_id,provider,provider_asset_id,provider_public_id").eq("id", id).single();
    if (rowError || !row) throw new Error("Archivo no encontrado.");
    if (row.user_id !== user.id) throw new Error("No tienes permiso para eliminar este archivo.");

    if (row.provider === "cloudinary" && row.provider_public_id) {
      const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
      const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
      const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
      if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary no está configurado.");
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = await sha1(`public_id=${row.provider_public_id}&timestamp=${timestamp}${apiSecret}`);
      const body = new URLSearchParams({ public_id: row.provider_public_id, timestamp, api_key: apiKey, signature });
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/destroy`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      const result = await response.json();
      if (!response.ok || (result.result !== "ok" && result.result !== "not found")) throw new Error(result?.error?.message ?? "Cloudinary no pudo eliminar el archivo.");
    }

    const { error: deleteError } = await supabase.from(table).delete().eq("id", id).eq("user_id", user.id);
    if (deleteError) throw deleteError;
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error al eliminar" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
