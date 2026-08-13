import { DEFAULT_SETTINGS, type Settings } from "./calc";

const STORAGE_KEY = "pcnk-counter-state";

export type AppState = {
  settings: Settings;
  records: number[];
};

export const DEFAULT_STATE: AppState = {
  settings: { ...DEFAULT_SETTINGS },
  records: [],
};

function isSettings(value: unknown): value is Settings {
  if (!value || typeof value !== "object") {
    return false;
  }
  const s = value as Record<string, unknown>;
  return (
    typeof s.storedBalls === "number" &&
    typeof s.unitBalls === "number" &&
    typeof s.unitYen === "number"
  );
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_STATE, settings: { ...DEFAULT_SETTINGS } };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_STATE, settings: { ...DEFAULT_SETTINGS } };
    }
    const data = parsed as Record<string, unknown>;
    const settings = isSettings(data.settings)
      ? {
          storedBalls: Math.max(0, Math.floor(data.settings.storedBalls)),
          unitBalls: Math.max(1, Math.floor(data.settings.unitBalls) || 1),
          unitYen: Math.max(0, Math.floor(data.settings.unitYen)),
        }
      : { ...DEFAULT_SETTINGS };
    const records = Array.isArray(data.records)
      ? data.records.filter((n): n is number => Number.isInteger(n) && n >= 0)
      : [];
    return { settings, records };
  } catch {
    return { ...DEFAULT_STATE, settings: { ...DEFAULT_SETTINGS } };
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
