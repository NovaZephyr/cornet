import { useEffect, useState } from "react";
import { readExperiments } from "@/lib/experiments";

export function useShellExperiments() {
  const [shortsEnabled, setShortsEnabled] = useState(false);

  useEffect(() => {
    const sync = () => setShortsEnabled(readExperiments().shorts);
    sync();

    window.addEventListener("corenetwork-experiments-change", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("corenetwork-experiments-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { shortsEnabled };
}
