import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, type AppRole, type ChannelInfoLayout, type Profile } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/lib/storage";
import { fetchVideos } from "@/lib/queries";
import type { ChannelData } from "./channel-data";
import { useCallback } from "react";
import { toast } from "sonner";

export type ChannelProfile = Omit<Profile, "channel_style"> & {
  channel_style?: string | null;
  subscriber_count?: number;
  channel_primary_color?: string | null;
  channel_secondary_color?: string | null;
  channel_surface_color?: string | null;
  channel_text_color?: string | null;
  channel_info_layout?: ChannelInfoLayout | null;
};

export function useChannelData(username: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["channel", username],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      if (error) throw error;
      return (data as ChannelProfile | null) ?? null;
    },
  });

  const profile = profileQuery.data;

  const rolesQuery = useQuery({
    queryKey: ["channel-roles", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_badges", { _user_id: profile!.id });
      if (error) throw error;
      return (data ?? []) as AppRole[];
    },
  });

  const videosQuery = useQuery({
    queryKey: ["channel-videos", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: () => fetchVideos({ userId: profile!.id }),
  });

  const subscriptionsQuery = useQuery({
    queryKey: ["channel-subs", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("subscriptions").select("subscriber_id").eq("channel_id", profile!.id);
      if (error) throw error;
      return (data ?? []).map((row) => ({ subscriber_id: row.subscriber_id }));
    },
  });

  const background = useSignedUrl(profile?.background_path);
  const partnerGif = useSignedUrl(profile?.gif_path);
  const roles = rolesQuery.data ?? [];
  const subscriptions = subscriptionsQuery.data ?? [];
  const videos = videosQuery.data ?? [];
  const isSubscribed = Boolean(user?.id && subscriptions.some((subscription) => subscription.subscriber_id === user.id));
  const isPartnerChannel = roles.includes("partner");

  const toggleSubscription = useCallback(async () => {
    if (!user || !profile) {
      toast.error("Inicia sesión para suscribirte");
      return;
    }

    const result = isSubscribed
      ? await supabase.from("subscriptions").delete().eq("subscriber_id", user.id).eq("channel_id", profile.id)
      : await supabase.from("subscriptions").insert({ subscriber_id: user.id, channel_id: profile.id });

    if (result.error) {
      toast.error("No se pudo actualizar la suscripción");
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["channel-subs", profile.id] });
    await queryClient.invalidateQueries({ queryKey: ["videos"] });
  }, [isSubscribed, profile, queryClient, user]);

  const data: ChannelData | null = profile
    ? {
        profile,
        videos,
        roles,
        subscriptions,
        isSubscribed,
        isPartnerChannel,
        partnerGif: partnerGif ?? null,
        background: background ?? null,
      }
    : null;

  return {
    data,
    isLoading: profileQuery.isLoading,
    isFetching: profileQuery.isFetching || rolesQuery.isFetching || videosQuery.isFetching || subscriptionsQuery.isFetching,
    error: profileQuery.error ?? rolesQuery.error ?? videosQuery.error ?? subscriptionsQuery.error ?? null,
    toggleSubscription,
  };
}
