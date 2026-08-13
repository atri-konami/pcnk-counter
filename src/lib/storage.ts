import { DEFAULT_SETTINGS, type Settings } from "./calc";

const STORAGE_KEY = "pcnk-counter-state";

export type SavedSession = {
  id: string;
  name: string;
  savedAt: number;
  settings: Settings;
  records: number[];
  border: number | null;
};

export type AppState = {
  settings: Settings;
  records: number[];
  sessionName: string;
  border: number | null;
  sessions: SavedSession[];
};

export type SaveResult =
  | { ok: true }
  | { ok: false; quotaExceeded: boolean };

export const DEFAULT_STATE: AppState = {
  settings: { ...DEFAULT_SETTINGS },
  records: [],
  sessionName: "",
  border: null,
  sessions: [],
};

function emptyState(): AppState {
  return {
    ...DEFAULT_STATE,
    settings: { ...DEFAULT_SETTINGS },
    sessions: [],
  };
}

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

function parseSettings(value: unknown): Settings {
  if (!isSettings(value)) {
    return { ...DEFAULT_SETTINGS };
  }
  return {
    storedBalls: Math.max(0, Math.floor(value.storedBalls)),
    unitBalls: Math.max(1, Math.floor(value.unitBalls) || 1),
    unitYen: Math.max(0, Math.floor(value.unitYen)),
  };
}

function parseRecords(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((n): n is number => Number.isInteger(n) && n >= 0)
    : [];
}

function parseBorder(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

function parseSavedSession(value: unknown): SavedSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const s = value as Record<string, unknown>;
  if (typeof s.id !== "string" || s.id === "") {
    return null;
  }
  if (typeof s.name !== "string") {
    return null;
  }
  if (typeof s.savedAt !== "number" || !Number.isFinite(s.savedAt)) {
    return null;
  }
  return {
    id: s.id,
    name: s.name,
    savedAt: s.savedAt,
    settings: parseSettings(s.settings),
    records: parseRecords(s.records),
    border: parseBorder(s.border),
  };
}

export function defaultSessionName(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function archiveCurrentSession(
  state: AppState,
  savedAt = Date.now(),
): AppState {
  const name = state.sessionName.trim() || defaultSessionName(new Date(savedAt));
  const session: SavedSession = {
    id: newSessionId(),
    name,
    savedAt,
    settings: { ...state.settings },
    records: [...state.records],
    border: state.border,
  };
  return {
    ...state,
    records: [],
    sessionName: "",
    border: null,
    sessions: [session, ...state.sessions],
  };
}

export function deleteSavedSession(state: AppState, id: string): AppState {
  return {
    ...state,
    sessions: state.sessions.filter((session) => session.id !== id),
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyState();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return emptyState();
    }
    const data = parsed as Record<string, unknown>;
    const sessions = Array.isArray(data.sessions)
      ? data.sessions.flatMap((item) => {
          const session = parseSavedSession(item);
          return session ? [session] : [];
        })
      : [];
    return {
      settings: parseSettings(data.settings),
      records: parseRecords(data.records),
      sessionName: typeof data.sessionName === "string" ? data.sessionName : "",
      border: parseBorder(data.border),
      sessions,
    };
  } catch {
    return emptyState();
  }
}

function isQuotaExceeded(error: unknown): boolean {
  if (!(error instanceof DOMException)) {
    return false;
  }
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22
  );
}

export function saveState(state: AppState): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    return { ok: false, quotaExceeded: isQuotaExceeded(error) };
  }
}
