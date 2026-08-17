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

    const { action } = await req.json();

    // ---------- action: "start" — crea (o reutiliza) el live input ----------
    if (action === "start") {
      const { data: banned } = await supabase.rpc("is_banned", { _user_id: userId });
      if (banned) return json({ error: "banned" }, 403);

      const { data: existing } = await supabase
        .from("live_streams")
        .select("id, cf_live_input_uid")
        .eq("user_id", userId)
        .maybeSingle();

      let liveInputUid = existing?.cf_live_input_uid;
      let rtmpUrl: string | undefined;
      let streamKey: string | undefined;

      if (!liveInputUid) {
        const cfRes = await fetch(CF_BASE, {
          method: "POST",
          headers: cfHeaders(),
          body: JSON.stringify({
            meta: { name: `corenetwork-${userId}` },
            recording: { mode: "off" },
          }),
        });
        const cfData = await cfRes.json();
        if (!cfData.success) return json({ error: "cloudflare_error", detail: cfData.errors }, 502);

        liveInputUid = cfData.result.uid;
        rtmpUrl = cfData.result.rtmps.url;
        streamKey = cfData.result.rtmps.streamKey;

        const { data: row, error: insertErr } = await supabase
          .from("live_streams")
          .upsert(
            { user_id: userId, cf_live_input_uid: liveInputUid, cf_playback_uid: liveInputUid, status: "offline" },
            { onConflict: "user_id" },
          )
          .select("id")
          .single();
        if (insertErr) return json({ error: insertErr.message }, 500);

        await supabase.from("live_stream_secrets").upsert({
          live_stream_id: row.id,
          rtmp_url: rtmpUrl,
          stream_key: streamKey,
        });
      } else {
        const secretsRow = await supabase
          .from("live_stream_secrets")
          .select("rtmp_url, stream_key")
          .eq("live_stream_id", existing!.id)
          .single();
        rtmpUrl = secretsRow.data?.rtmp_url;
        streamKey = secretsRow.data?.stream_key;
      }

      return json({ rtmpUrl, streamKey, liveInputUid });
    }

    // ---------- action: "status" — consulta si ya está recibiendo señal ----------
    if (action === "status") {
      const { data: stream } = await supabase
        .from("live_streams")
        .select("id, cf_live_input_uid, status")
        .eq("user_id", userId)
        .maybeSingle();
      if (!stream?.cf_live_input_uid) return json({ status: "offline" });

      const cfRes = await fetch(`${CF_BASE}/${stream.cf_live_input_uid}`, { headers: cfHeaders() });
      const cfData = await cfRes.json();
      const isLive = cfData?.result?.status?.current?.state === "connected";

      const newStatus = isLive ? "live" : stream.status === "live" ? "ended" : "offline";
      if (newStatus !== stream.status) {
        await supabase
          .from("live_streams")
          .update({
            status: newStatus,
            started_at: newStatus === "live" ? new Date().toISOString() : undefined,
            ended_at: newStatus === "ended" ? new Date().toISOString() : undefined,
          })
          .eq("id", stream.id);
      }
      return json({ status: newStatus });
    }

    // ---------- action: "end" — corta la transmisión manualmente ----------
    if (action === "end") {
      const { data: stream } = await supabase
        .from("live_streams")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (stream) {
        await supabase
          .from("live_streams")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("id", stream.id);
      }
      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    return json({ error: "unexpected_error", detail: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
