import { createServerFn } from "@tanstack/react-start";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getCommunityPostLikeCounts = createServerFn({ method: "POST" })
  .inputValidator((input: { postIds: string[] }) => {
    if (!input || !Array.isArray(input.postIds) || input.postIds.length > 100) {
      throw new Error("Lista de publicaciones no válida");
    }
    if (!input.postIds.every((id) => typeof id === "string" && UUID_PATTERN.test(id))) {
      throw new Error("Identificador de publicación no válido");
    }
    return { postIds: [...new Set(input.postIds)] };
  })
  .handler(async ({ data }) => {
    if (data.postIds.length === 0) return {};

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any).rpc(
      "community_post_like_counts",
      { p_post_ids: data.postIds },
    );
    if (error) {
      console.error("[Community] Could not load public reaction totals", error);
      throw new Error("No se pudieron cargar las reacciones.");
    }

    return Object.fromEntries(
      ((rows ?? []) as { post_id: string; likes: number | string }[]).map((row) => [
        row.post_id,
        Number(row.likes) || 0,
      ]),
    );
  });