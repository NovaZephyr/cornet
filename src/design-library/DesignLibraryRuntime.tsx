import { useEffect } from "react";
import { getTheme } from "./index";

const THEME_KEY = "corenetwork-theme-v3";
const LOADED_LINKS = "data-cornet-design-library";
const LEGACY_COSMIC_LINKS = ["/cosmic-panda-channel-fullpage.css", "/cosmic-panda-channel-layout.css"];

function removeLegacyGlobalLayoutStyles() {
  document.head.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet']").forEach((link) => {
    const href = link.getAttribute("href") ?? "";
    if (LEGACY_COSMIC_LINKS.some((legacy) => href.endsWith(legacy))) link.remove();
  });
}

function loadStylesheets(stylesheets: string[]) {
  const desired = new Set(stylesheets);
  document.head.querySelectorAll<HTMLLinkElement>(`link[${LOADED_LINKS}]`).forEach((link) => {
    const href = link.getAttribute("href") ?? "";
    if (!desired.has(href)) link.remove();
  });

  desired.forEach((href) => {
    const exists = Array.from(document.head.querySelectorAll<HTMLLinkElement>(`link[${LOADED_LINKS}]`)).some(
      (link) => link.getAttribute("href") === href,
    );
    if (exists) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute(LOADED_LINKS, "true");
    document.head.appendChild(link);
  });
}

function syncTheme(themeId: string) {
  const theme = getTheme(themeId);
  removeLegacyGlobalLayoutStyles();
  loadStylesheets(theme.stylesheets);
}

export function DesignLibraryRuntime() {
  useEffect(() => {
    const root = document.documentElement;
    const initialTheme = root.dataset.theme || window.localStorage.getItem(THEME_KEY) || "grad-ocean";
    syncTheme(initialTheme);

    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.type === "attributes" && record.attributeName === "data-theme")) {
        syncTheme(root.dataset.theme || "grad-ocean");
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    const storageHandler = (event: StorageEvent) => {
      if (event.key === THEME_KEY && event.newValue) syncTheme(event.newValue);
    };
    window.addEventListener("storage", storageHandler);

    const cleanupTimer = window.setTimeout(removeLegacyGlobalLayoutStyles, 0);
    return () => {
      window.clearTimeout(cleanupTimer);
      observer.disconnect();
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  return null;
}
