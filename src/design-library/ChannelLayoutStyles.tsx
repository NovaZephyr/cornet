import { useEffect } from "react";
import { getChannelLayout } from "./index";

const LAYOUT_LINK_ATTR = "data-cornet-channel-layout";

/**
 * Loads the stylesheets registered for a channel layout in the Design Library.
 * Layout styles are kept in a separate link namespace than theme styles so the
 * global theme runtime never removes them (and vice versa). Adding a new layout
 * only requires registering it in `src/design-library/index.ts`.
 */
export function ChannelLayoutStyles({ layoutId }: { layoutId: string }) {
  useEffect(() => {
    const layout = getChannelLayout(layoutId);
    const desired = new Set(layout?.stylesheets ?? []);

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
