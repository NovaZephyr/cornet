import { toast } from "sonner";

const selectors = ".cn-cosmic-tabs > span";

function getCanvas() {
  return document.querySelector<HTMLElement>(".cn-cosmic-channel-inner");
}

function setView(view: "channel" | "videos" | "community" | "information") {
  const canvas = getCanvas();
  if (!canvas) return;
  canvas.dataset.cosmicView = view;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function relocateSections() {
  const canvas = getCanvas();
  const columns = document.querySelector<HTMLElement>(".cn-cosmic-columns");
  if (!canvas || !columns) return;

  const community = document.getElementById("community");
  if (community && community.parentElement !== canvas) {
    community.classList.add("cn-cosmic-community-section");
    canvas.appendChild(community);
  }

  const about = columns.querySelector<HTMLElement>(".cn-cosmic-left > .cn-cosmic-panel");
  if (about && !about.id) about.id = "about";

  const uploadsTitle = document.querySelector<HTMLElement>("#uploads .cn-cosmic-panel-title span:first-child");
  if (uploadsTitle) uploadsTitle.textContent = "Videos";
}

function setupCosmicTabs(root: ParentNode = document) {
  relocateSections();
  const canvas = getCanvas();
  if (canvas && !canvas.dataset.cosmicView) canvas.dataset.cosmicView = "channel";

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
          setView("channel");
          break;
        case "VIDEOS":
          setView("videos");
          break;
        case "COMUNIDAD":
          setView("community");
          break;
        case "INFORMACIÓN":
        case "INFORMACION":
          setView("information");
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
