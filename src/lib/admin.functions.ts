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
    if (data.userId === context.userId) throw new Error("No puedes eliminar tu propia cuenta");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
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

    // Best-effort cleanup for media paths that belong to Supabase Storage.
    const storagePaths = [video.video_path, video.thumbnail_path]
      .filter((path): path is string => typeof path === "string" && path.length > 0)
      .filter((path) => !/^https?:\/\//i.test(path))
      .map((path) => path.replace(/^\/?(videos|media)\//, ""));

    if (storagePaths.length) {
      const { error: storageError } = await supabaseAdmin.storage.from("videos").remove(storagePaths);
      if (storageError) {
        // Thumbnails can live in media; don't prevent the DB deletion if the old object is external.
        await supabaseAdmin.storage.from("media").remove(storagePaths).catch(() => undefined);
      }
    }

    const { error } = await supabaseAdmin.from("videos").delete().eq("id", data.videoId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
