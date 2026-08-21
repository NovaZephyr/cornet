import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requireAdmin = async (context: { supabase: typeof import("@/integrations/supabase/client").supabase; userId: string }) => {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Solo los administradores pueden moderar videos");
};

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Solo los administradores pueden eliminar cuentas");
    if (data.userId === context.userId) throw new Error("No puedes eliminar tu propia cuenta desde el panel");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setVideoAgeRestriction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ videoId: z.string().uuid(), ageRestricted: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("videos")
      .update({ age_restricted: data.ageRestricted })
      .eq("id", data.videoId);
    if (error) throw new Error(error.message);
    return { ok: true, ageRestricted: data.ageRestricted };
  });

export const deleteVideoAsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ videoId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: video, error: lookupError } = await supabaseAdmin
      .from("videos")
      .select("id, video_path, thumbnail_path")
      .eq("id", data.videoId)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (!video) throw new Error("El video no existe o ya fue eliminado");

    const storageTargets: Array<{ bucket: "videos" | "media"; key: string }> = [];
    for (const path of [video.video_path, video.thumbnail_path]) {
      if (typeof path !== "string" || !path || /^https?:\/\//i.test(path)) continue;
      if (path.startsWith("videos/")) storageTargets.push({ bucket: "videos", key: path.slice("videos/".length) });
      else if (path.startsWith("media/")) storageTargets.push({ bucket: "media", key: path.slice("media/".length) });
    }
    for (const target of storageTargets) {
      const { error: storageError } = await supabaseAdmin.storage.from(target.bucket).remove([target.key]);
      if (storageError) console.warn("[Cornet] media cleanup failed", target.bucket, target.key, storageError.message);
    }

    const { error } = await supabaseAdmin.from("videos").delete().eq("id", data.videoId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
