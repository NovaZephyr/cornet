import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sha1(input: string) {
  return crypto.subtle.digest("SHA-1", new TextEncoder().encode(input)).then((buffer) =>
    Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("")
  );
}

function signParams(params: Record<string, string>, secret: string) {
  const canonical = Object.entries(params)
    .filter(([, value]) => value !== "" && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return sha1(`${canonical}${secret}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No autorizado");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autorizado");

    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
    if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary no está configurado en los secretos de Supabase.");

    const form = await req.formData();
    const file = form.get("file");
    const mode = form.get("mode") === "temp" ? "temp" : "permanent";
    const expiresAt = form.get("expires_at")?.toString() ?? "";
    if (!(file instanceof File)) throw new Error("Falta el archivo.");

    const maxBytes = mode === "temp" ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxBytes) throw new Error(`El archivo supera el límite de ${Math.round(maxBytes / 1024 / 1024)} MB.`);

    const safeBase = file.name.replace(/[\\/\0]/g, "-").trim().slice(0, 180) || "archivo";
    const publicId = `corenetwork/${mode}/${user.id}/${crypto.randomUUID()}-${safeBase.replace(/\.[^.]+$/, "")}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const resourceType = "raw";
    const params: Record<string, string> = {
      folder: `corenetwork/${mode}/${user.id}`,
      public_id: publicId.split("/").pop()!,
      timestamp,
    };

    if (mode === "temp") {
      if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) throw new Error("La fecha de expiración no es válida.");
      params.access_control = JSON.stringify([{ access_type: "anonymous", end: new Date(expiresAt).toISOString() }]);
    }

    const uploadBody = new FormData();
    uploadBody.append("file", file, file.name);
    uploadBody.append("api_key", apiKey);
    uploadBody.append("timestamp", timestamp);
    uploadBody.append("folder", params.folder);
    uploadBody.append("public_id", params.public_id);
    if (params.access_control) uploadBody.append("access_control", params.access_control);
    uploadBody.append("signature", await signParams(params, apiSecret));

    const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: "POST", body: uploadBody });
    const cloudinary = await cloudinaryResponse.json();
    if (!cloudinaryResponse.ok) throw new Error(cloudinary?.error?.message ?? "Cloudinary rechazó la subida.");

    return new Response(JSON.stringify({
      asset_id: cloudinary.asset_id,
      public_id: cloudinary.public_id,
      secure_url: cloudinary.secure_url,
      bytes: cloudinary.bytes ?? file.size,
      format: cloudinary.format ?? null,
      resource_type: cloudinary.resource_type,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error al subir el archivo" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
