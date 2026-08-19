import { toast } from "sonner";

const selectors = ".cn-cosmic-tabs > span";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function relocateSections() {
  const canvas = document.querySelector<HTMLElement>(".cn-cosmic-channel-inner");
  const columns = document.querySelector<HTMLElement>(".cn-cosmic-columns");
  if (!canvas || !columns) return;

  const community = document.getElementById("community");
  if (community && community.parentElement !== canvas) {
    community.classList.add("cn-cosmic-community-section");
    canvas.appendChild(community);
  }

  const about = columns.querySelector<HTMLElement>(".cn-cosmic-left > .cn-cosmic-panel");
  if (about && !about.id) about.id = "about";
}

function setupCosmicTabs(root: ParentNode = document) {
  relocateSections();
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
        case "INFORMACION":
          scrollToSection("about");
          break;
        case "PLAYLISTS":
          window.location.href = "/playlists";
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
