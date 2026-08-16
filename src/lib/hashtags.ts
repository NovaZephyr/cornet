import { supabase } from "@/integrations/supabase/client";

export function extractHashtags(text: string): string[] {
  const tags = new Set<string>();
  for (const match of text.matchAll(/(^|\s)#([\p{L}\p{N}_-]+)/gu)) {
    const normalized = match[2].normalize("NFKC").trim().toLowerCase();
    if (normalized) tags.add(normalized.slice(0, 64));
  }
  return [...tags].slice(0, 50);
}

async function ensureHashtags(names: string[]) {
  if (!names.length) return [] as { id: string; normalized_name: string }[];
  const payload = names.map((normalized_name) => ({ name: normalized_name, normalized_name }));
  const { error: insertError } = await supabase.from("hashtags").upsert(payload, { onConflict: "normalized_name", ignoreDuplicates: true });
  if (insertError) throw insertError;
  const { data, error } = await supabase.from("hashtags").select("id, normalized_name").in("normalized_name", names);
  if (error) throw error;
  return (data ?? []) as { id: string; normalized_name: string }[];
}

export async function syncVideoHashtags(videoId: string, text: string) {
  const names = extractHashtags(text);
  const tags = await ensureHashtags(names);
  const { error: clearError } = await supabase.from("video_hashtags").delete().eq("video_id", videoId);
  if (clearError) throw clearError;
  if (!tags.length) return;
  const { error } = await supabase.from("video_hashtags").insert(tags.map((tag) => ({ video_id: videoId, hashtag_id: tag.id })));
  if (error) throw error;
}

export async function syncCommunityPostHashtags(postId: string, text: string) {
  const names = extractHashtags(text);
  const tags = await ensureHashtags(names);
  const { error: clearError } = await supabase.from("community_post_hashtags").delete().eq("post_id", postId);
  if (clearError) throw clearError;
  if (!tags.length) return;
  const { error } = await supabase.from("community_post_hashtags").insert(tags.map((tag) => ({ post_id: postId, hashtag_id: tag.id })));
  if (error) throw error;
}
