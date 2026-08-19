import { useEffect } from "react";
import { getChannelLayout } from "./index";

const LAYOUT_LINK_ATTR = "data-cornet-channel-layout";
const CANVAS_STYLESHEET = "/channel-layout-full-canvas.css";

/**
 * Loads the layout stylesheet plus the shared channel-canvas geometry layer.
 * The geometry layer guarantees every channel layout owns the full available
 * shell canvas; individual layouts only control their inner composition.
 */
export function ChannelLayoutStyles({ layoutId }: { layoutId: string }) {
  useEffect(() => {
    const layout = getChannelLayout(layoutId);
    const desired = new Set([...(layout?.stylesheets ?? []), CANVAS_STYLESHEET]);

    document.head.querySelectorAll<HTMLLinkElement>(`link[${LAYOUT_LINK_ATTR}]`).forEach((link) => {
      if (!desired.has(link.getAttribute("href") ?? "")) link.remove();
    });

    desired.forEach((href) => {
      const exists = Array.from(document.head.querySelectorAll<HTMLLinkElement>(`link[${LAYOUT_LINK_ATTR}]`)).some(
        (link) => link.getAttribute("href") === href,
      );
      if (exists) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute(LAYOUT_LINK_ATTR, "true");
      document.head.appendChild(link);
    });

    return () => {
      document.head.querySelectorAll<HTMLLinkElement>(`link[${LAYOUT_LINK_ATTR}]`).forEach((link) => link.remove());
    };
  }, [layoutId]);

  return null;
}
