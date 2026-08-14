import {
  DEFAULT_SETTINGS,
  HELD_DISPLAY_MODES,
  INVESTMENT_DISPLAY_MODES,
  parseRecordList,
  type HeldDisplayMode,
  type InvestmentDisplayMode,
  type RecordEntry,
  type Settings,
} from "./calc";

const STORAGE_KEY = "pcnk-counter-state";

export type SavedSession = {
  id: string;
  name: string;
  savedAt: number;
  settings: Settings;
  records: RecordEntry[];
  border: number | null;
};

export type AppState = {
  settings: Settings;
  records: RecordEntry[];
  sessionName: string;
  border: number | null;
  sessions: SavedSession[];
  heldDisplayMode: HeldDisplayMode;
  investmentDisplayMode: InvestmentDisplayMode;
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
  heldDisplayMode: "balls",
  investmentDisplayMode: "ballsAndYen",
};

function emptyState(): AppState {
  return {
    ...DEFAULT_STATE,
    settings: { ...DEFAULT_SETTINGS },
    sessions: [],
  };
}

function parseHeldDisplayMode(value: unknown): HeldDisplayMode {
  return HELD_DISPLAY_MODES.includes(value as HeldDisplayMode)
    ? (value as HeldDisplayMode)
    : "balls";
}

function parseInvestmentDisplayMode(value: unknown): InvestmentDisplayMode {
  return INVESTMENT_DISPLAY_MODES.includes(value as InvestmentDisplayMode)
    ? (value as InvestmentDisplayMode)
    : "ballsAndYen";
}

function parseSettings(value: unknown): Settings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_SETTINGS };
  }
  const s = value as Record<string, unknown>;
  if (typeof s.storedBalls !== "number" || typeof s.unitBalls !== "number") {
    return { ...DEFAULT_SETTINGS };
  }
  const storedBalls = Math.max(0, Math.floor(s.storedBalls));
  const unitBalls = Math.max(1, Math.floor(s.unitBalls) || 1);

  let lendRateYen = DEFAULT_SETTINGS.lendRateYen;
  if (typeof s.lendRateYen === "number" && Number.isFinite(s.lendRateYen) && s.lendRateYen >= 0) {
    lendRateYen = Math.floor(s.lendRateYen);
  } else if (typeof s.unitYen === "number" && Number.isFinite(s.unitYen)) {
    const unitYen = Math.max(0, Math.floor(s.unitYen));
    const inferred = unitYen / unitBalls;
    if (Number.isInteger(inferred) && inferred >= 0) {
      lendRateYen = inferred;
    }
  }

  const exchangeBalls =
    typeof s.exchangeBalls === "number" &&
    Number.isFinite(s.exchangeBalls) &&
    s.exchangeBalls >= 1
      ? Math.max(1, Math.floor(s.exchangeBalls) || 1)
      : DEFAULT_SETTINGS.exchangeBalls;

  return { storedBalls, unitBalls, lendRateYen, exchangeBalls };
}

function parseRecords(value: unknown): RecordEntry[] {
  return parseRecordList(value);
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
      heldDisplayMode: parseHeldDisplayMode(data.heldDisplayMode),
      investmentDisplayMode: parseInvestmentDisplayMode(data.investmentDisplayMode),
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
