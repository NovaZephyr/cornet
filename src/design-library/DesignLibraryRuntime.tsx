import { useEffect } from "react";
import { getTheme } from "./index";

const THEME_KEY = "corenetwork-theme-v3";
const LOADED_LINKS = "data-cornet-design-library";

function normalizeHrefs(stylesheets: string[]) {
  return Array.from(new Set(stylesheets));
}

function loadStylesheets(stylesheets: string[]) {
  const desired = new Set(normalizeHrefs(stylesheets));
  document.head.querySelectorAll<HTMLLinkElement>(`link[${LOADED_LINKS}]`).forEach((link) => {
    if (!desired.has(link.getAttribute("href") ?? "")) link.remove();
  });

  desired.forEach((href) => {
    const exists = document.head.querySelector(`link[${LOADED_LINKS}][href="${CSS.escape(href)}"]`);
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
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  const light = ["light", "retro2012", "feather2013", "youtube2019", "windowsAero", "frutigerAero", "web2Glossy", "xpLuna", "grad-candy"].includes(theme.id);
  root.classList.toggle("dark", !light);
  root.style.colorScheme = light ? "light" : "dark";
  loadStylesheets(theme.stylesheets);
}

export function DesignLibraryRuntime() {
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_KEY) ?? "grad-ocean";
      syncTheme(saved);
    } catch {
      syncTheme("grad-ocean");
    }

    const handler = (event: StorageEvent) => {
      if (event.key === THEME_KEY && event.newValue) syncTheme(event.newValue);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return null;
}
