export type ExperimentKey = "shorts";

export type ExperimentDefinition = {
  key: ExperimentKey;
  name: string;
  description: string;
  status: "testing" | "stable";
};

export const EXPERIMENTS: ExperimentDefinition[] = [
  {
    key: "shorts",
    name: "Shorts",
    description: "Activa la nueva experiencia vertical de Shorts de Cornet.",
    status: "testing",
  },
];

const STORAGE_KEY = "corenetwork-experiments-v1";
export type ExperimentState = Record<ExperimentKey, boolean>;
export const DEFAULT_EXPERIMENTS: ExperimentState = { shorts: false };

export function readExperiments(): ExperimentState {
  if (typeof window === "undefined") return { ...DEFAULT_EXPERIMENTS };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return { ...DEFAULT_EXPERIMENTS, ...(parsed && typeof parsed === "object" ? parsed : {}) };
  } catch {
    return { ...DEFAULT_EXPERIMENTS };
  }
}

export function saveExperiments(state: ExperimentState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  document.documentElement.dataset.experiments = Object.entries(state)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)
    .join(" ");
}

export function isExperimentEnabled(key: ExperimentKey) {
  return readExperiments()[key] === true;
}

export function setExperiment(key: ExperimentKey, enabled: boolean) {
  const next = { ...readExperiments(), [key]: enabled };
  saveExperiments(next);
  window.dispatchEvent(new CustomEvent("corenetwork-experiments-change", { detail: next }));
  return next;
}
