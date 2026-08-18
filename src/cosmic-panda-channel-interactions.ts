import { toast } from "sonner";

const selectors = ".cn-cosmic-tabs > span";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupCosmicTabs(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(selectors).forEach((tab) => {
    if (tab.dataset.cosmicInteractive === "true") return;
    tab.dataset.cosmicInteractive = "true";
    tab.setAttribute("role", "button");
    tab.setAttribute("tabindex", "0");

    const activate = () => {
      const label = tab.textContent?.trim().toUpperCase() ?? "";
      root.querySelectorAll<HTMLElement>(selectors).forEach((other) => {
        other.classList.toggle("is-active", other === tab);
        if (other === tab) other.setAttribute("aria-current", "page");
        else other.removeAttribute("aria-current");
      });

      switch (label) {
        case "CANAL":
          window.scrollTo({ top: 0, behavior: "smooth" });
          break;
        case "VIDEOS":
          scrollToSection("uploads");
          break;
        case "COMUNIDAD":
          scrollToSection("community");
          break;
        case "INFORMACIÓN":
        case "INFORMACION": {
          const about = document.querySelector<HTMLElement>(".cn-cosmic-left .cn-cosmic-panel");
          about?.scrollIntoView({ behavior: "smooth", block: "start" });
          break;
        }
        case "PLAYLISTS":
          toast.info("Las playlists del canal todavía no están disponibles.");
          break;
        default:
          break;
      }
    };

    tab.addEventListener("click", activate);
    tab.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });
}

if (typeof window !== "undefined") {
  setupCosmicTabs();
  new MutationObserver(() => setupCosmicTabs()).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
