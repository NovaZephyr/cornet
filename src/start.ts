import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_EMBED_IMAGE = "https://mvwpxnszcpyayofqgtmv.supabase.co/storage/v1/object/public/media/61fe7d8d-f53f-4838-a870-4588c16e474b/announcement-7871ca44-f13f-45e5-a3c1-7908f0c348a9.png";

function escapeAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const videoEmbedMiddleware = createMiddleware().server(async ({ request, next }) => {
  const result = await next();
  const response = result as unknown as Response;
  const url = new URL(request.url);

  if (url.pathname !== "/watch") return result;

  const code = url.searchParams.get("v");
  const contentType = response.headers.get("content-type") ?? "";
  if (!code || !contentType.includes("text/html")) return result;

  try {
    const { data: video } = await supabase
      .from("videos")
      .select("code, title, description, thumbnail_path, user_id")
      .eq("code", code)
      .eq("visibility", "public")
      .maybeSingle();

    if (!video) return result;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_path")
      .eq("id", video.user_id)
      .maybeSingle();

    const authorName = profile?.display_name || profile?.username || "CoreNetwork";
    const title = video.title?.trim() || "Video en CoreNetwork";
    const description = (video.description || `Video de ${authorName} en CoreNetwork`)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);

    let imageUrl = DEFAULT_EMBED_IMAGE;
    if (video.thumbnail_path) {
      const rawPath = String(video.thumbnail_path);
      if (/^https?:\/\//i.test(rawPath)) {
        imageUrl = rawPath;
      } else {
        const key = rawPath.startsWith("media/") ? rawPath.slice("media/".length) : rawPath;
        const publicUrl = supabase.storage.from("media").getPublicUrl(key).data.publicUrl;
        if (publicUrl) imageUrl = publicUrl;
      }
    }

    let iconUrl = DEFAULT_EMBED_IMAGE;
    if (profile?.avatar_path) {
      const rawAvatar = String(profile.avatar_path);
      if (/^https?:\/\//i.test(rawAvatar)) {
        iconUrl = rawAvatar;
      } else {
        const key = rawAvatar.startsWith("media/") ? rawAvatar.slice("media/".length) : rawAvatar;
        const publicUrl = supabase.storage.from("media").getPublicUrl(key).data.publicUrl;
        if (publicUrl) iconUrl = publicUrl;
      }
    }

    const canonical = `${url.origin}/watch?v=${encodeURIComponent(video.code)}`;
    const html = await response.clone().text();
    const withoutManagedTags = html
      .replace(/<title[^>]*>[\s\S]*?<\/title>/i, "")
      .replace(/<meta\s+(?:name|property)=(?:"|')[^"']+(?:"|')[^>]*>\s*/gi, (tag) => {
        const normalized = tag.toLowerCase();
        return /(og:|twitter:|description|author)/i.test(normalized) ? "" : tag;
      })
      .replace(/<link\s+rel=(?:"|')canonical(?:"|')[^>]*>\s*/gi, "");

    const tags = [
      `<title>${escapeAttr(title)} - CoreNetwork</title>`,
      `<meta name="description" content="${escapeAttr(description)}" />`,
      `<meta name="author" content="${escapeAttr(authorName)}" />`,
      `<meta property="og:title" content="${escapeAttr(title)}" />`,
      `<meta property="og:description" content="${escapeAttr(description)}" />`,
      `<meta property="og:type" content="video.other" />`,
      `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
      `<meta property="og:site_name" content="${escapeAttr(authorName)}" />`,
      `<meta property="og:image" content="${escapeAttr(imageUrl)}" />`,
      `<meta property="og:image:alt" content="${escapeAttr(title)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
      `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
      `<meta name="twitter:image" content="${escapeAttr(imageUrl)}" />`,
      `<link rel="icon" href="${escapeAttr(iconUrl)}" />`,
      `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    ].join("\n");

    const enriched = withoutManagedTags.replace(/<head>/i, `<head>\n${tags}\n`);
    const headers = new Headers(response.headers);
    headers.delete("content-length");

    return new Response(enriched, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }) as unknown as typeof result;
  } catch (error) {
    console.error("[video-embed] failed to enrich watch metadata", error);
    return result;
  }
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [videoEmbedMiddleware, csrfMiddleware],
}));
