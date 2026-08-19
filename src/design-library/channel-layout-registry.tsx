import type { ComponentType } from "react";
import { channelLayouts } from "./index";
import type { ChannelLayoutProps } from "./channel-data";
import { ClassicChannel, CosmicPandaChannel } from "./channel-layouts";
import { BentoGridChannel, TerminalChannel } from "./custom-channel-layouts";
import {
  EarlyYoutubeLayout,
  StarRatingLayout,
  Transition2010Layout,
  OneChannel2013Layout,
  MaterialLite2015Layout,
  ModernMinimal2020Layout,
  FeatherProfileLayout,
  CreatorStudioLayout,
  ProfileCardLayout,
  CommunityProfileLayout,
  VideoChannelLayout,
  MusicChannelLayout,
  GamingChannelLayout,
  MinimalProfileLayout,
  Channel2015Layout,
  Channel2019Layout,
} from "./channel-layout-variants";

export type ChannelLayoutComponent = ComponentType<ChannelLayoutProps>;

const components: Record<string, ChannelLayoutComponent> = {
  corenetwork: ClassicChannel,
  "cosmic-panda": CosmicPandaChannel,
  "early-youtube-2005": EarlyYoutubeLayout,
  "classic-2009": EarlyYoutubeLayout,
  "star-rating-2007": StarRatingLayout,
  "transition-2010": Transition2010Layout,
  "standard-2012": Transition2010Layout,
  "onechannel-2013": OneChannel2013Layout,
  "material-lite-2015": MaterialLite2015Layout,
  "channel-2015": Channel2015Layout,
  "channel-2019": Channel2019Layout,
  "modern-minimal-2020": ModernMinimal2020Layout,
  terminal: TerminalChannel,
  "bento-grid": BentoGridChannel,
  "feather-profile": FeatherProfileLayout,
  "creator-studio": CreatorStudioLayout,
  "profile-card": ProfileCardLayout,
  "community-profile": CommunityProfileLayout,
  "video-channel": VideoChannelLayout,
  "music-channel": MusicChannelLayout,
  "gaming-channel": GamingChannelLayout,
  "minimal-profile": MinimalProfileLayout,
};

export function getChannelLayoutComponent(layoutId: string): ChannelLayoutComponent {
  return components[layoutId] ?? ClassicChannel;
}

export function getChannelLayoutDefinition(layoutId: string) {
  return channelLayouts.find((layout) => layout.id === layoutId) ?? channelLayouts[0];
}

export function channelLayoutUsesShellSidebar(layoutId: string) {
  return layoutId === "corenetwork";
}
