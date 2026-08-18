export type Settings = {
  storedBalls: number;
  unitBalls: number;
  lendRateYen: number;
  exchangeBalls: number;
};

export type HeldDisplayMode = "balls" | "yenWithFraction" | "yenWithoutFraction";
export type InvestmentDisplayMode = "ballsAndYen" | "yenWithoutFraction";

export type AmountDisplay = {
  value: string;
  subvalue: string | null;
};

export type RecordKind =
  | "start"
  | "play"
  | "jackpot"
  | "finish"
  | "adjustHeld"
  | "adjustInvestment";

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
  | "finish"
  | "remainder"
  | "adjustHeld"
  | "adjustInvestment";

export type PlayMode = "start" | "held" | "remainder" | "stored" | "cash";

export type RecordRow = {
  totalSpins: number;
  delta: number | null;
  isStart: boolean;
  playIndex: number | null;
  displayKind: DisplayKind;
  inAverage: boolean;
  amount: number | null;
  snapshot?: {
    heldBalls: number;
    investmentYen: number;
    usedStoredBalls: number;
    cashYen?: number;
    usedHeldBalls?: number;
  };
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
  remainderBalls: number;
  remainingStoredBalls: number;
};

export const DEFAULT_SETTINGS: Settings = {
  storedBalls: 0,
  unitBalls: 250,
  lendRateYen: 4,
  exchangeBalls: 280,
};

export const LEND_RATE_PRESETS: { yen: number; label: string }[] = [
  { yen: 4, label: "4円" },
  { yen: 1, label: "1円" },
];

export const EXCHANGE_RATE_PRESETS: { balls: number; label: string }[] = [
  { balls: 280, label: "280玉 / 1000円" },
  { balls: 250, label: "250玉（4円等価）" },
  { balls: 1120, label: "1120玉 / 1000円" },
  { balls: 1000, label: "1000玉（1円等価）" },
];

export const HELD_DISPLAY_MODES: HeldDisplayMode[] = [
  "balls",
  "yenWithoutFraction",
  "yenWithFraction",
];

export const INVESTMENT_DISPLAY_MODES: InvestmentDisplayMode[] = [
  "ballsAndYen",
  "yenWithoutFraction",
];

export const INVESTMENT_INCREMENTS = [200, 500, 1000, 10000] as const;

const AVERAGE_BASE_YEN = 1000;

const GAMEPLAY_KINDS: RecordKind[] = ["start", "play", "jackpot", "finish"];

function isGameplayKind(kind: RecordKind): boolean {
  return GAMEPLAY_KINDS.includes(kind);
}

function gameplayRecordBefore(
  records: RecordEntry[],
  index: number,
): RecordEntry | undefined {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (isGameplayKind(records[i].kind)) {
      return records[i];
    }
  }
  return undefined;
}

export function lastGameplayRecord(
  records: RecordEntry[],
): RecordEntry | undefined {
  return gameplayRecordBefore(records, records.length);
}

export function lastCopiedTotalSpins(records: RecordEntry[]): number {
  if (records.length === 0) {
    return 0;
  }
  return records[records.length - 1].totalSpins;
}

export function unitYenFromSettings(settings: Settings): number {
  const unitBalls = Math.max(1, Math.floor(settings.unitBalls) || 1);
  const lendRateYen = Math.max(0, Math.floor(settings.lendRateYen));
  return unitBalls * lendRateYen;
}

export function yenWithFraction(balls: number, exchangeBalls: number): number {
  const rate = Math.max(1, Math.floor(exchangeBalls) || 1);
  const n = Math.max(0, Math.floor(balls));
  return Math.floor((n * AVERAGE_BASE_YEN) / rate);
}

export function yenWithoutFraction(
  balls: number,
  exchangeBalls: number,
): { yen: number; remainderBalls: number } {
  const rate = Math.max(1, Math.floor(exchangeBalls) || 1);
  const n = Math.max(0, Math.floor(balls));
  const units = Math.floor(n / rate);
  return { yen: units * AVERAGE_BASE_YEN, remainderBalls: n % rate };
}

function formatYen(yen: number): string {
  return `${yen.toLocaleString("ja-JP")}円`;
}

function storedBallsInnerNote(usedStoredBalls: number): string {
  const n = Math.max(0, Math.floor(usedStoredBalls));
  if (n <= 0) {
    return "";
  }
  return ` (内 貯玉${n.toLocaleString("ja-JP")}玉)`;
}

export function sessionProfitYen(
  heldBalls: number,
  usedStoredBalls: number,
  investmentYen: number,
  exchangeBalls: number,
): number {
  const heldYen = yenWithFraction(heldBalls, exchangeBalls);
  const investedYen =
    yenWithFraction(usedStoredBalls, exchangeBalls) + investmentYen;
  return heldYen - investedYen;
}

export function formatSignedYen(yen: number): string {
  const magnitude = `${Math.abs(yen).toLocaleString("ja-JP")}円`;
  return yen < 0 ? `-${magnitude}` : `+${magnitude}`;
}

export function formatHeldBallsWithYen(
  heldBalls: number,
  exchangeBalls: number,
): string {
  const balls = Math.max(0, Math.floor(heldBalls));
  return `${balls.toLocaleString("ja-JP")}玉（${formatYen(
    yenWithFraction(balls, exchangeBalls),
  )}）`;
}

export function formatHeldDisplay(
  heldBalls: number,
  exchangeBalls: number,
  mode: HeldDisplayMode,
): AmountDisplay {
  if (mode === "balls") {
    return { value: `${heldBalls.toLocaleString("ja-JP")}玉`, subvalue: null };
  }
  if (mode === "yenWithFraction") {
    return {
      value: formatYen(yenWithFraction(heldBalls, exchangeBalls)),
      subvalue: null,
    };
  }
  const { yen, remainderBalls } = yenWithoutFraction(heldBalls, exchangeBalls);
  return {
    value: formatYen(yen),
    subvalue:
      remainderBalls > 0 ? `端玉${remainderBalls.toLocaleString("ja-JP")}発` : null,
  };
}

export function formatInvestmentDisplay(
  usedStoredBalls: number,
  investmentYen: number,
  exchangeBalls: number,
  mode: InvestmentDisplayMode,
): AmountDisplay {
  const yenLabel = formatYen(investmentYen);
  if (mode === "ballsAndYen") {
    return {
      value:
        usedStoredBalls > 0
          ? `貯玉${usedStoredBalls.toLocaleString("ja-JP")}発 + ${yenLabel}`
          : yenLabel,
      subvalue: null,
    };
  }
  const storedYen = yenWithFraction(usedStoredBalls, exchangeBalls);
  return {
    value: `${formatYen(storedYen + investmentYen)}${storedBallsInnerNote(usedStoredBalls)}`,
    subvalue: null,
  };
}

export function nextHeldDisplayMode(mode: HeldDisplayMode): HeldDisplayMode {
  const index = HELD_DISPLAY_MODES.indexOf(mode);
  const current = index < 0 ? 0 : index;
  return HELD_DISPLAY_MODES[(current + 1) % HELD_DISPLAY_MODES.length];
}

export function nextInvestmentDisplayMode(
  mode: InvestmentDisplayMode,
): InvestmentDisplayMode {
  const index = INVESTMENT_DISPLAY_MODES.indexOf(mode);
  const current = index < 0 ? 0 : index;
  return INVESTMENT_DISPLAY_MODES[(current + 1) % INVESTMENT_DISPLAY_MODES.length];
}

export function heldDisplayModeLabel(mode: HeldDisplayMode): string {
  switch (mode) {
    case "balls":
      return "玉";
    case "yenWithFraction":
      return "円（端玉なし）";
    case "yenWithoutFraction":
      return "円（端玉あり）";
  }
}

export function investmentDisplayModeLabel(mode: InvestmentDisplayMode): string {
  switch (mode) {
    case "ballsAndYen":
      return "玉+円";
    case "yenWithoutFraction":
      return "円（端玉なし）";
  }
}

export function heldDisplayAriaLabel(mode: HeldDisplayMode): string {
  return `持ち玉（${heldDisplayModeLabel(mode)}）。タップで表示切替`;
}

export function investmentDisplayAriaLabel(mode: InvestmentDisplayMode): string {
  return `投資額（${investmentDisplayModeLabel(mode)}）。タップで表示切替`;
}

export function lendRateSelectOptions(
  current: number,
): { yen: number; label: string }[] {
  if (LEND_RATE_PRESETS.some((preset) => preset.yen === current)) {
    return LEND_RATE_PRESETS;
  }
  return [...LEND_RATE_PRESETS, { yen: current, label: `${current}円` }];
}

export function exchangeRateSelectOptions(
  current: number,
): { balls: number; label: string }[] {
  if (EXCHANGE_RATE_PRESETS.some((preset) => preset.balls === current)) {
    return EXCHANGE_RATE_PRESETS;
  }
  return [
    ...EXCHANGE_RATE_PRESETS,
    { balls: current, label: `${current}玉 / 1000円` },
  ];
}

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
    raw.kind === "jackpot" ||
    raw.kind === "finish" ||
    raw.kind === "play" ||
    raw.kind === "start" ||
    raw.kind === "adjustHeld" ||
    raw.kind === "adjustInvestment"
      ? raw.kind
      : index === 0
        ? "start"
        : "play";
  const entry: RecordEntry = { totalSpins: raw.totalSpins, kind };
  if (kind === "jackpot" || kind === "finish") {
    entry.cashYen =
      typeof raw.cashYen === "number" && Number.isInteger(raw.cashYen) && raw.cashYen >= 0
        ? raw.cashYen
        : kind === "finish"
          ? 0
          : null;
    entry.heldBalls =
      typeof raw.heldBalls === "number" && Number.isInteger(raw.heldBalls) && raw.heldBalls >= 0
        ? raw.heldBalls
        : 0;
  }
  if (kind === "adjustHeld") {
    entry.heldBalls =
      typeof raw.heldBalls === "number" && Number.isInteger(raw.heldBalls) && raw.heldBalls >= 0
        ? raw.heldBalls
        : 0;
  }
  if (kind === "adjustInvestment") {
    entry.cashYen =
      typeof raw.cashYen === "number" && Number.isInteger(raw.cashYen) && raw.cashYen >= 0
        ? raw.cashYen
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
  const last = lastGameplayRecord(records);
  return last === undefined || last.kind === "jackpot";
}

export function canAddSpin(records: RecordEntry[], next: number): boolean {
  if (!Number.isInteger(next) || next < 0) {
    return false;
  }
  if (needsNewBaseline(records)) {
    return true;
  }
  const last = lastGameplayRecord(records);
  return last === undefined || next >= last.totalSpins;
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
    case "finish":
      return "手動";
    case "remainder":
      return "端数";
    case "adjustHeld":
      return "持玉";
    case "adjustInvestment":
      return "投資";
  }
}

export function rowIndexLabel(row: RecordRow): string {
  if (row.displayKind === "start") {
    return "開始";
  }
  if (row.displayKind === "jackpot") {
    return "当";
  }
  if (row.displayKind === "finish") {
    return "手動";
  }
  if (row.displayKind === "remainder") {
    return "端数";
  }
  if (row.displayKind === "adjustHeld" || row.displayKind === "adjustInvestment") {
    return "—";
  }
  return String(row.playIndex ?? "");
}

export function rowTotalLabel(row: RecordRow): string {
  if (row.displayKind === "adjustHeld") {
    return `${(row.amount ?? 0).toLocaleString("ja-JP")}玉`;
  }
  if (row.displayKind === "adjustInvestment") {
    return `+${(row.amount ?? 0).toLocaleString("ja-JP")}円`;
  }
  return row.totalSpins.toLocaleString("ja-JP");
}

export const HISTORY_GROUP_SIZE = 10;

const HISTORY_GROUP_KINDS: DisplayKind[] = ["paid", "stored", "held"];

export type HistoryListItem =
  | { type: "single"; row: RecordRow; index: number }
  | { type: "group"; rows: RecordRow[]; index: number };

function isHistoryGroupKind(kind: DisplayKind): boolean {
  return HISTORY_GROUP_KINDS.includes(kind);
}

export function groupHistoryRows(rows: RecordRow[]): HistoryListItem[] {
  const items: HistoryListItem[] = [];
  let i = 0;
  while (i < rows.length) {
    const kind = rows[i].displayKind;
    if (!isHistoryGroupKind(kind)) {
      items.push({ type: "single", row: rows[i], index: i });
      i += 1;
      continue;
    }
    let j = i;
    while (j < rows.length && isHistoryGroupKind(rows[j].displayKind)) {
      j += 1;
    }
    let offset = i;
    while (offset + HISTORY_GROUP_SIZE <= j) {
      items.push({
        type: "group",
        rows: rows.slice(offset, offset + HISTORY_GROUP_SIZE),
        index: offset,
      });
      offset += HISTORY_GROUP_SIZE;
    }
    if (offset < j) {
      items.push({
        type: "group",
        rows: rows.slice(offset, j),
        index: offset,
      });
    }
    i = j;
  }
  return items;
}

export function groupedRowIndexLabel(rows: RecordRow[]): string {
  const first = rows[0]?.playIndex;
  const last = rows[rows.length - 1]?.playIndex;
  if (first == null || last == null) {
    return `×${rows.length}`;
  }
  return `${first}–${last}`;
}

export function groupedRowTotalLabel(rows: RecordRow[]): string {
  const last = rows[rows.length - 1];
  return last === undefined ? "—" : last.totalSpins.toLocaleString("ja-JP");
}

export function groupedRowDeltaLabel(rows: RecordRow[]): string {
  const sum = rows.reduce((acc, row) => acc + (row.delta ?? 0), 0);
  return `+${sum}`;
}

export function groupedRowKindClass(rows: RecordRow[]): DisplayKind | "mixed" {
  const first = rows[0]?.displayKind;
  if (first === undefined) {
    return "mixed";
  }
  return rows.every((row) => row.displayKind === first) ? first : "mixed";
}

export function groupedRowKindLabel(rows: RecordRow[]): string {
  const kinds: DisplayKind[] = [];
  for (const row of rows) {
    if (!kinds.includes(row.displayKind)) {
      kinds.push(row.displayKind);
    }
  }
  return kinds.map(displayKindLabel).join("・");
}

export function playModeHint(mode: PlayMode, balls: number): string | null {
  switch (mode) {
    case "held":
      return `持ち玉遊技中（残り${balls.toLocaleString("ja-JP")}玉）。記録しても投資は増えず、持ち玉から減算します。`;
    case "remainder":
      return `端数残り${balls.toLocaleString("ja-JP")}玉。打ち切ったら回転数を記録します（平均対象外）。`;
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

export function resolveFinishCash(
  cashRaw: string,
): { ok: true; cashYen: number } | { ok: false; error: string } {
  if (cashRaw.trim() === "") {
    return { ok: true, cashYen: 0 };
  }
  const parsed = parseNonNegativeInt(cashRaw);
  if (parsed === null) {
    return { ok: false, error: "現金投資額は0以上の整数を入力してください" };
  }
  return { ok: true, cashYen: parsed };
}

export function resolveFinishHeld(
  heldRaw: string,
  currentHeld: number,
): { ok: true; remaining: number; usedHeld: number } | { ok: false; error: string } {
  const remaining =
    heldRaw.trim() === "" ? 0 : parseNonNegativeInt(heldRaw);
  if (remaining === null) {
    return { ok: false, error: "記録時の持ち玉は0以上の整数を入力してください" };
  }
  if (remaining > currentHeld) {
    return { ok: false, error: "記録時の持ち玉が現在の持ち玉を超えています" };
  }
  return { ok: true, remaining, usedHeld: currentHeld - remaining };
}

function currentPlayMode(
  hasGameplay: boolean,
  heldBalls: number,
  storedUnitsLeft: number,
  storedRemainder: number,
  unitBalls: number,
): PlayMode {
  if (!hasGameplay) {
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
  if (storedRemainder > 0) {
    return "remainder";
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
  const lendRateYen = Math.max(0, Math.floor(settings.lendRateYen));
  const unitYen = unitYenFromSettings(settings);

  const freeRows = Math.floor(storedBalls / unitBalls);
  let storedUnitsLeft = freeRows;
  let storedRemainder = storedBalls % unitBalls;
  let heldBalls = 0;
  let usedStoredBalls = 0;
  let investmentYen = 0;
  let paidRows = 0;
  let includedDelta = 0;
  let includedYen = 0;
  let includedCount = 0;
  let playIndexCounter = 0;

  const rows: RecordRow[] = records.map((entry, i) => {
    if (entry.kind === "adjustHeld") {
      heldBalls = Math.max(0, Math.floor(entry.heldBalls ?? 0));
      return {
        totalSpins: entry.totalSpins,
        delta: null,
        isStart: false,
        playIndex: null,
        displayKind: "adjustHeld",
        inAverage: false,
        amount: heldBalls,
      };
    }
    if (entry.kind === "adjustInvestment") {
      const yen = Math.max(0, Math.floor(entry.cashYen ?? 0));
      investmentYen += yen;
      return {
        totalSpins: entry.totalSpins,
        delta: null,
        isStart: false,
        playIndex: null,
        displayKind: "adjustInvestment",
        inAverage: false,
        amount: yen,
      };
    }
    if (i === 0 || entry.kind === "start") {
      return {
        totalSpins: entry.totalSpins,
        delta: null,
        isStart: true,
        playIndex: null,
        displayKind: "start",
        inAverage: false,
        amount: null,
      };
    }

    const prevGameplay = gameplayRecordBefore(records, i);
    const delta =
      prevGameplay === undefined || prevGameplay.kind === "jackpot"
        ? null
        : entry.totalSpins - prevGameplay.totalSpins;

    if (entry.kind === "jackpot") {
      const inHeldPlay = heldBalls > 0;
      const inStoredRemainder =
        !inHeldPlay && storedUnitsLeft === 0 && storedRemainder > 0;
      if (inStoredRemainder) {
        storedRemainder = 0;
      } else if (!inHeldPlay) {
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
        amount: null,
        snapshot: { heldBalls, investmentYen, usedStoredBalls },
      };
    }

    if (entry.kind === "finish") {
      const remaining = Math.max(0, Math.floor(entry.heldBalls ?? 0));
      const usedHeldBalls = Math.max(0, heldBalls - remaining);
      const cashYen = Math.max(0, Math.floor(entry.cashYen ?? 0));
      const finishYen = usedHeldBalls * lendRateYen + cashYen;
      const inAverage = finishYen > 0 && delta !== null;
      if (inAverage) {
        includedDelta += delta;
        includedYen += finishYen;
        includedCount += 1;
      }
      investmentYen += cashYen;
      heldBalls = remaining;
      return {
        totalSpins: entry.totalSpins,
        delta,
        isStart: false,
        playIndex: null,
        displayKind: "finish",
        inAverage,
        amount: cashYen,
        snapshot: {
          heldBalls,
          investmentYen,
          usedStoredBalls,
          cashYen,
          usedHeldBalls,
        },
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
    } else if (storedRemainder > 0) {
      usedStoredBalls += storedRemainder;
      storedRemainder = 0;
      displayKind = "remainder";
      inAverage = false;
    } else {
      investmentYen += unitYen;
      paidRows += 1;
      displayKind = "paid";
      inAverage = true;
    }

    if (inAverage && delta !== null) {
      includedDelta += delta;
      includedYen += unitYen;
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
      amount: null,
    };
  });

  const denom = includedYen / AVERAGE_BASE_YEN;
  const average = includedYen > 0 ? includedDelta / denom : null;
  const averageLabel = average === null ? "—" : `${average.toFixed(1)}回転/k`;
  const borderDiff =
    average === null || border === null ? null : average - border;
  const borderDiffLabel =
    borderDiff === null
      ? null
      : `${borderDiff >= 0 ? "+" : ""}${borderDiff.toFixed(1)}`;
  const investmentLabel = formatInvestmentDisplay(
    usedStoredBalls,
    investmentYen,
    settings.exchangeBalls,
    "yenWithoutFraction",
  ).value;
  const playMode = currentPlayMode(
    lastGameplayRecord(records) !== undefined,
    heldBalls,
    storedUnitsLeft,
    storedRemainder,
    unitBalls,
  );
  const remainderBalls =
    heldBalls > 0 && heldBalls < unitBalls
      ? heldBalls
      : heldBalls === 0 && storedUnitsLeft === 0
        ? storedRemainder
        : 0;
  const remainingStoredBalls = storedUnitsLeft * unitBalls + storedRemainder;

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
    remainderBalls,
    remainingStoredBalls,
  };
}
