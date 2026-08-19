import type { ComponentType } from "react";
import { channelLayouts } from "./index";
import type { ChannelLayoutProps } from "./channel-data";
import { ClassicChannel, CosmicPandaChannel, HistoricalChannel } from "./channel-layouts";

export type ChannelLayoutComponent = ComponentType<ChannelLayoutProps>;

const components: Record<string, ChannelLayoutComponent> = {
  corenetwork: ClassicChannel,
  "cosmic-panda": CosmicPandaChannel,
};

const defaultHistorical: ChannelLayoutComponent = HistoricalChannel;

export function getChannelLayoutComponent(layoutId: string): ChannelLayoutComponent {
  return components[layoutId] ?? defaultHistorical;
}

export function getChannelLayoutDefinition(layoutId: string) {
  return channelLayouts.find((layout) => layout.id === layoutId) ?? channelLayouts[0];
}

export function channelLayoutUsesShellSidebar(layoutId: string) {
  return layoutId === "corenetwork";
}
