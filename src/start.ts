import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { supabase } from "@/integrations/supabase/client";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const videoSeoMiddleware = createMiddleware().server(async ({ request, next }) => {
  const response = await next();
  const url = new URL(request.url);

  if (url.pathname !== "/watch") return response;

  const code = url.searchParams.get("v");
  const contentType = response.headers.get("content-type") ?? "";
  if (!code || !contentType.includes("text/html")) return response;

  try {
    const { data: video } = await supabase
      .from("videos")
      .select("id, code, user_id, title, description, thumbnail_path")
      .eq("code", code)
      .eq("visibility", "public")
      .maybeSingle();

    if (!video) return response;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", video.user_id)
      .maybeSingle();

    const channelName = profile?.display_name || profile?.username || "CoreNetwork";
    const title = `${video.title} - CoreNetwork`;
    const description = (video.description || `Video publicado por ${channelName}`)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
    const siteName = `${channelName} - Author`;
    const canonical = `${url.origin}/watch?v=${encodeURIComponent(video.code)}`;

    let imageUrl = `${url.origin}/no-thumbnail.svg`;
    if (video.thumbnail_path) {
      const rawPath = String(video.thumbnail_path);
      if (rawPath.toLowerCase().startsWith("http://") || rawPath.toLowerCase().startsWith("https://")) {
        imageUrl = rawPath;
      } else {
        const key = rawPath.startsWith("media/") ? rawPath.slice(6) : rawPath;
        const publicUrl = supabase.storage.from("media").getPublicUrl(key).data.publicUrl;
        if (publicUrl) imageUrl = publicUrl;
      }
    }

    const escapeAttr = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    let html = await response.text();
    html = html.replace(/<title>[^<]*<\/title>/i, "");

    const tags = [
      `<title>${escapeAttr(title)}</title>`,
      `<meta name="author" content="${escapeAttr(channelName)}" />`,
      `<meta property="og:title" content="${escapeAttr(title)}" />`,
      `<meta property="og:description" content="${escapeAttr(description)}" />`,
      `<meta property="og:site_name" content="${escapeAttr(siteName)}" />`,
      `<meta property="og:type" content="video.other" />`,
      `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
      `<meta property="og:image" content="${escapeAttr(imageUrl)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
      `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
      `<meta name="twitter:image" content="${escapeAttr(imageUrl)}" />`,
    ].join("\n");

    html = html.replace(/<head>/i, `<head>\n${tags}\n`);

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("[video-seo] failed to enrich watch metadata", error);
    return response;
  }
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, videoSeoMiddleware, csrfMiddleware],
}));
