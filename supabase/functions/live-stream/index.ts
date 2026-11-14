import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CF_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
const CF_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
const CF_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/live_inputs`;

function cfHeaders() {
  return {
    Authorization: `Bearer ${CF_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
      return json({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json();
    const { action } = body;
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 5000) : "";

    if (action === "start") {
      if (!title) return json({ error: "Añade un título para tu transmisión." }, 400);

      const { data: banned, error: banError } = await supabase.rpc("is_banned", { _user_id: userId });
      if (banError) return json({ error: "No se pudo verificar el estado de tu cuenta." }, 500);
      if (banned) return json({ error: "Tu cuenta no puede iniciar transmisiones." }, 403);

      const { data: existing, error: existingError } = await supabase
        .from("live_streams")
        .select("id, cf_live_input_uid")
        .eq("user_id", userId)
        .maybeSingle();
      if (existingError) return json({ error: existingError.message }, 500);

      let liveInputUid = existing?.cf_live_input_uid;
      let rtmpUrl: string | undefined;
      let streamKey: string | undefined;
      let liveStreamId = existing?.id;

      if (!liveInputUid) {
        const cfRes = await fetch(CF_BASE, {
          method: "POST",
          headers: cfHeaders(),
          body: JSON.stringify({
            meta: { name: `cornet-${userId}` },
            recording: { mode: "off" },
          }),
        });
        const cfData = await cfRes.json();
        if (!cfRes.ok || !cfData.success) {
          return json({ error: "No se pudo crear el canal de emisión en Cloudflare.", detail: cfData.errors }, 502);
        }

        liveInputUid = cfData.result.uid;
        rtmpUrl = cfData.result.rtmps.url;
        streamKey = cfData.result.rtmps.streamKey;

        const { data: row, error: insertError } = await supabase
          .from("live_streams")
          .upsert(
            {
              user_id: userId,
              title,
              description,
              cf_live_input_uid: liveInputUid,
              cf_playback_uid: liveInputUid,
              status: "offline",
            },
            { onConflict: "user_id" },
          )
          .select("id")
          .single();
        if (insertError) return json({ error: insertError.message }, 500);
        liveStreamId = row.id;

        const { error: secretError } = await supabase.from("live_stream_secrets").upsert({
          live_stream_id: liveStreamId,
          rtmp_url: rtmpUrl,
          stream_key: streamKey,
        });
        if (secretError) return json({ error: "No se pudieron guardar las credenciales de emisión." }, 500);
      } else {
        const { error: updateError } = await supabase
          .from("live_streams")
          .update({ title, description, updated_at: new Date().toISOString() })
          .eq("id", liveStreamId);
        if (updateError) return json({ error: updateError.message }, 500);

        const { data: secretsRow, error: secretsError } = await supabase
          .from("live_stream_secrets")
          .select("rtmp_url, stream_key")
          .eq("live_stream_id", liveStreamId)
          .single();
        if (secretsError || !secretsRow) {
          return json({ error: "No se encontraron las credenciales guardadas para este canal." }, 500);
        }
        rtmpUrl = secretsRow.rtmp_url;
        streamKey = secretsRow.stream_key;
      }

      return json({ rtmpUrl, streamKey, liveInputUid });
    }

    if (action === "status") {
      const { data: stream, error: streamError } = await supabase
        .from("live_streams")
        .select("id, cf_live_input_uid, status")
        .eq("user_id", userId)
        .maybeSingle();
      if (streamError) return json({ error: streamError.message }, 500);
      if (!stream?.cf_live_input_uid) return json({ status: "offline" });

      const cfRes = await fetch(`${CF_BASE}/${stream.cf_live_input_uid}`, { headers: cfHeaders() });
      const cfData = await cfRes.json();
      if (!cfRes.ok || !cfData.success) return json({ error: "No se pudo consultar el estado en Cloudflare." }, 502);

      const isLive = cfData?.result?.status?.current?.state === "connected";
      const newStatus = isLive ? "live" : stream.status === "live" ? "ended" : stream.status;
      if (newStatus !== stream.status) {
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("live_streams")
          .update({
            status: newStatus,
            started_at: newStatus === "live" ? now : undefined,
            ended_at: newStatus === "ended" ? now : undefined,
            updated_at: now,
          })
          .eq("id", stream.id);
        if (updateError) return json({ error: updateError.message }, 500);
      }
      return json({ status: newStatus });
    }

    if (action === "end") {
      const { data: stream, error: streamError } = await supabase
        .from("live_streams")
        .select("id, cf_live_input_uid")
        .eq("user_id", userId)
        .maybeSingle();
      if (streamError) return json({ error: streamError.message }, 500);
      if (!stream) return json({ error: "No hay una transmisión configurada." }, 404);

      if (stream.cf_live_input_uid) {
        const cfRes = await fetch(`${CF_BASE}/${stream.cf_live_input_uid}`, { headers: cfHeaders() });
        const cfData = await cfRes.json();
        if (!cfRes.ok || !cfData.success) return json({ error: "No se pudo verificar la señal de Cloudflare." }, 502);
        if (cfData?.result?.status?.current?.state === "connected") {
          return json({ error: "Detén primero la transmisión desde OBS. Cuando Cloudflare deje de recibir señal, podrás finalizarla aquí." }, 409);
        }
      }

      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("live_streams")
        .update({ status: "ended", ended_at: now, updated_at: now })
        .eq("id", stream.id);
      if (updateError) return json({ error: updateError.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (error) {
    return json({ error: "unexpected_error", detail: String(error) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
