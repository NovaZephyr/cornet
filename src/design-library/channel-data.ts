import type { AppRole, ChannelInfoLayout, Profile } from "@/hooks/useAuth";
import type { fetchVideos } from "@/lib/queries";

/**
 * Stable data contract shared by every channel layout.
 * Layouts may render this contract, but must not own fetching, auth,
 * theme selection, or global shell state.
 */
export type ChannelVideo = Awaited<ReturnType<typeof fetchVideos>>[number];

export type ChannelSubscription = {
  subscriber_id: string;
};

export type ChannelData = {
  profile: Omit<Profile, "channel_style"> & {
    channel_style?: string | null;
    subscriber_count?: number;
    channel_primary_color?: string | null;
    channel_secondary_color?: string | null;
    channel_surface_color?: string | null;
    channel_text_color?: string | null;
    channel_info_layout?: ChannelInfoLayout | null;
  };
  videos: ChannelVideo[];
  roles: AppRole[];
  subscriptions: ChannelSubscription[];
  isSubscribed: boolean;
  isPartnerChannel: boolean;
  partnerGif: string | null;
  background: string | null;
};

export type ChannelLayoutProps = {
  data: ChannelData;
  onSubscribe: () => void;
  onReport: () => void;
};
