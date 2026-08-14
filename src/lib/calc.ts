export type Settings = {
  storedBalls: number;
  unitBalls: number;
  unitYen: number;
};

export type RecordKind = "start" | "play" | "jackpot";

export type RecordEntry = {
  totalSpins: number;
  kind: RecordKind;
  cashYen?: number | null;
  heldBalls?: number;
};

export type DisplayKind =
  | "start"
  | "stored"
  | "paid"
  | "held"
  | "jackpot"
  | "remainder";

export type PlayMode = "start" | "held" | "remainder" | "stored" | "cash";

export type RecordRow = {
  totalSpins: number;
  delta: number | null;
  isStart: boolean;
  playIndex: number | null;
  displayKind: DisplayKind;
  inAverage: boolean;
};

export type Summary = {
  playCount: number;
  heldBalls: number;
  totalDelta: number;
  average: number | null;
  averageLabel: string;
  borderDiff: number | null;
  borderDiffLabel: string | null;
  freeRows: number;
  paidRows: number;
  usedStoredBalls: number;
  investmentYen: number;
  investmentLabel: string;
  rows: RecordRow[];
  playMode: PlayMode;
};

export const DEFAULT_SETTINGS: Settings = {
  storedBalls: 0,
  unitBalls: 250,
  unitYen: 1000,
};

const AVERAGE_BASE_YEN = 1000;

export function parseNonNegativeInt(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    return null;
  }
  return n;
}

export function parseNonNegativeNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }
  if (!/^\d+(\.\d+)?$/.test(value.trim())) {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}

export function toRecordEntry(value: unknown, index: number): RecordEntry | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return { totalSpins: value, kind: index === 0 ? "start" : "play" };
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.totalSpins !== "number" || !Number.isInteger(raw.totalSpins) || raw.totalSpins < 0) {
    return null;
  }
  const kind: RecordKind =
    raw.kind === "jackpot" || raw.kind === "play" || raw.kind === "start"
      ? raw.kind
      : index === 0
        ? "start"
        : "play";
  const entry: RecordEntry = { totalSpins: raw.totalSpins, kind };
  if (kind === "jackpot") {
    entry.cashYen =
      typeof raw.cashYen === "number" && Number.isInteger(raw.cashYen) && raw.cashYen >= 0
        ? raw.cashYen
        : null;
    entry.heldBalls =
      typeof raw.heldBalls === "number" && Number.isInteger(raw.heldBalls) && raw.heldBalls >= 0
        ? raw.heldBalls
        : 0;
  }
  return entry;
}

export function parseRecordList(value: unknown): RecordEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item, index) => {
    const entry = toRecordEntry(item, index);
    return entry ? [entry] : [];
  });
}

export function needsNewBaseline(records: RecordEntry[]): boolean {
  return (
    records.length === 0 || records[records.length - 1].kind === "jackpot"
  );
}

export function canAddSpin(records: RecordEntry[], next: number): boolean {
  if (!Number.isInteger(next) || next < 0) {
    return false;
  }
  if (needsNewBaseline(records)) {
    return true;
  }
  return next >= records[records.length - 1].totalSpins;
}

export function displayKindLabel(kind: DisplayKind): string {
  switch (kind) {
    case "start":
      return "基準";
    case "stored":
      return "貯玉";
    case "paid":
      return "現金";
    case "held":
      return "持ち玉";
    case "jackpot":
      return "当";
    case "remainder":
      return "端数";
  }
}

export function rowIndexLabel(row: RecordRow): string {
  if (row.displayKind === "start") {
    return "開始";
  }
  if (row.displayKind === "jackpot") {
    return "当";
  }
  if (row.displayKind === "remainder") {
    return "端数";
  }
  return String(row.playIndex ?? "");
}

export function playModeHint(mode: PlayMode, heldBalls: number): string | null {
  switch (mode) {
    case "held":
      return `持ち玉遊技中（残り${heldBalls.toLocaleString("ja-JP")}玉）。記録しても投資は増えず、持ち玉から減算します。`;
    case "remainder":
      return `端数残り${heldBalls.toLocaleString("ja-JP")}玉。打ち切ったら回転数を記録します（平均対象外）。`;
    case "stored":
      return "貯玉遊技中。大当たり時の現金は未入力のままで、貯玉を基準玉数ぶん加算します。";
    case "cash":
      return "現金遊技中。大当たり時は前回記録からの現金投資額を入力します。";
    case "start":
      return null;
  }
}

export function resolveJackpotCash(
  playMode: PlayMode,
  cashRaw: string,
): { ok: true; cashYen: number | null } | { ok: false; error: string } {
  if (playMode === "held" || playMode === "remainder") {
    return { ok: true, cashYen: null };
  }
  const trimmed = cashRaw.trim();
  if (trimmed === "") {
    if (playMode === "stored") {
      return { ok: true, cashYen: null };
    }
    return { ok: false, error: "現金遊技中は投資額を入力してください" };
  }
  const parsed = parseNonNegativeInt(cashRaw);
  if (parsed === null) {
    return { ok: false, error: "現金投資額は0以上の整数を入力してください" };
  }
  if (playMode === "cash" && parsed === 0) {
    return { ok: false, error: "現金遊技中は投資額を入力してください" };
  }
  return { ok: true, cashYen: parsed };
}

function currentPlayMode(
  recordsLength: number,
  heldBalls: number,
  storedUnitsLeft: number,
  unitBalls: number,
): PlayMode {
  if (recordsLength === 0) {
    return "start";
  }
  if (heldBalls >= unitBalls) {
    return "held";
  }
  if (heldBalls > 0) {
    return "remainder";
  }
  if (storedUnitsLeft > 0) {
    return "stored";
  }
  return "cash";
}

export function summarize(
  records: RecordEntry[],
  settings: Settings,
  border: number | null = null,
): Summary {
  const storedBalls = Math.max(0, Math.floor(settings.storedBalls));
  const unitBalls = Math.max(1, Math.floor(settings.unitBalls) || 1);
  const unitYen = Math.max(0, Math.floor(settings.unitYen));

  const freeRows = Math.floor(storedBalls / unitBalls);
  let storedUnitsLeft = freeRows;
  let heldBalls = 0;
  let usedStoredBalls = 0;
  let investmentYen = 0;
  let paidRows = 0;
  let includedDelta = 0;
  let includedCount = 0;
  let playIndexCounter = 0;

  const rows: RecordRow[] = records.map((entry, i) => {
    if (i === 0 || entry.kind === "start") {
      return {
        totalSpins: entry.totalSpins,
        delta: null,
        isStart: true,
        playIndex: null,
        displayKind: "start",
        inAverage: false,
      };
    }

    const prev = records[i - 1];
    const delta =
      prev.kind === "jackpot"
        ? null
        : entry.totalSpins - prev.totalSpins;

    if (entry.kind === "jackpot") {
      const inHeldPlay = heldBalls > 0;
      if (!inHeldPlay) {
        if (storedUnitsLeft > 0 && entry.cashYen == null) {
          storedUnitsLeft -= 1;
          usedStoredBalls += unitBalls;
        } else {
          investmentYen += entry.cashYen ?? 0;
        }
      }
      heldBalls = Math.max(0, Math.floor(entry.heldBalls ?? 0));
      return {
        totalSpins: entry.totalSpins,
        delta,
        isStart: false,
        playIndex: null,
        displayKind: "jackpot",
        inAverage: false,
      };
    }

    let displayKind: DisplayKind;
    let inAverage = false;

    if (heldBalls >= unitBalls) {
      heldBalls -= unitBalls;
      displayKind = "held";
      inAverage = true;
    } else if (heldBalls > 0) {
      heldBalls = 0;
      displayKind = "remainder";
      inAverage = false;
    } else if (storedUnitsLeft > 0) {
      storedUnitsLeft -= 1;
      usedStoredBalls += unitBalls;
      displayKind = "stored";
      inAverage = true;
    } else {
      investmentYen += unitYen;
      paidRows += 1;
      displayKind = "paid";
      inAverage = true;
    }

    if (inAverage && delta !== null) {
      includedDelta += delta;
      includedCount += 1;
      playIndexCounter += 1;
    }

    return {
      totalSpins: entry.totalSpins,
      delta,
      isStart: false,
      playIndex: inAverage && delta !== null ? playIndexCounter : null,
      displayKind,
      inAverage,
    };
  });

  const denom = (unitYen * includedCount) / AVERAGE_BASE_YEN;
  const average =
    includedCount > 0 && unitYen > 0 ? includedDelta / denom : null;
  const averageLabel = average === null ? "—" : `${average.toFixed(1)}回転/k`;
  const borderDiff =
    average === null || border === null ? null : average - border;
  const borderDiffLabel =
    borderDiff === null
      ? null
      : `${borderDiff >= 0 ? "+" : ""}${borderDiff.toFixed(1)}`;
  const yenLabel = `${investmentYen.toLocaleString("ja-JP")}円`;
  const investmentLabel =
    usedStoredBalls > 0 ? `貯玉${usedStoredBalls}発 + ${yenLabel}` : yenLabel;
  const playMode = currentPlayMode(records.length, heldBalls, storedUnitsLeft, unitBalls);

  return {
    playCount: includedCount,
    heldBalls,
    totalDelta: includedDelta,
    average,
    averageLabel,
    borderDiff,
    borderDiffLabel,
    freeRows,
    paidRows,
    usedStoredBalls,
    investmentYen,
    investmentLabel,
    rows,
    playMode,
  };
}
