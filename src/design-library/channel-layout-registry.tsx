import type { ComponentType } from "react";
import { channelLayouts } from "./index";
import type { ChannelLayoutProps } from "./channel-data";
import { ClassicChannel, CosmicPandaChannel } from "./channel-layouts";
import { BentoGridChannel, TerminalChannel } from "./custom-channel-layouts";
import { LiquidGlassChannel } from "./liquid-glass-channel";
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
import { Classic2009Layout, Standard2012Layout, MagazineLayout, CinephileLayout } from "./channel-layout-extra";
import { Channel20Layout } from "./channel-2-0-layout";

export type ChannelLayoutComponent = ComponentType<ChannelLayoutProps>;

const components: Record<string, ChannelLayoutComponent> = {
  corenetwork: ClassicChannel,
  "cosmic-panda": CosmicPandaChannel,
  "liquid-glass": LiquidGlassChannel,
  "classic-2009": Classic2009Layout,
  "standard-2012": Channel20Layout,
  "early-youtube-2005": EarlyYoutubeLayout,
  "star-rating-2007": StarRatingLayout,
  "transition-2010": Transition2010Layout,
  "onechannel-2013": OneChannel2013Layout,
  "material-lite-2015": MaterialLite2015Layout,
  "channel-2015": Channel2015Layout,
  "channel-2019": Channel2019Layout,
  "modern-minimal-2020": ModernMinimal2020Layout,
  terminal: TerminalChannel,
  "bento-grid": BentoGridChannel,
  magazine: MagazineLayout,
  cinephile: CinephileLayout,
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
