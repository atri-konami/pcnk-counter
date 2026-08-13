export type Settings = {
  storedBalls: number;
  unitBalls: number;
  unitYen: number;
};

export type RecordRow = {
  totalSpins: number;
  delta: number | null;
  isStored: boolean;
  isStart: boolean;
  playIndex: number | null;
};

export type Summary = {
  playCount: number;
  totalBalls: number;
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

export function canAddSpin(records: number[], next: number): boolean {
  if (!Number.isInteger(next) || next < 0) {
    return false;
  }
  if (records.length === 0) {
    return true;
  }
  return next >= records[records.length - 1];
}

export function summarize(
  records: number[],
  settings: Settings,
  border: number | null = null,
): Summary {
  const storedBalls = Math.max(0, Math.floor(settings.storedBalls));
  const unitBalls = Math.max(1, Math.floor(settings.unitBalls) || 1);
  const unitYen = Math.max(0, Math.floor(settings.unitYen));

  const playCount = Math.max(0, records.length - 1);
  const totalBalls = playCount * unitBalls;
  const freeRows = Math.floor(storedBalls / unitBalls);
  const paidRows = Math.max(0, playCount - freeRows);
  const usedStoredBalls = Math.min(playCount, freeRows) * unitBalls;
  const investmentYen = paidRows * unitYen;

  const rows: RecordRow[] = records.map((totalSpins, i) => {
    if (i === 0) {
      return {
        totalSpins,
        delta: null,
        isStored: false,
        isStart: true,
        playIndex: null,
      };
    }
    const playIndex = i;
    return {
      totalSpins,
      delta: totalSpins - records[i - 1],
      isStored: playIndex <= freeRows,
      isStart: false,
      playIndex,
    };
  });

  const totalDelta = rows.reduce((sum, row) => sum + (row.delta ?? 0), 0);
  const denom = (unitYen * playCount) / AVERAGE_BASE_YEN;
  const average =
    playCount > 0 && unitYen > 0 ? totalDelta / denom : null;
  const averageLabel = average === null ? "—" : `${average.toFixed(1)}回転/k`;
  const borderDiff =
    average === null || border === null ? null : average - border;
  const borderDiffLabel =
    borderDiff === null
      ? null
      : `${borderDiff >= 0 ? "+" : ""}${borderDiff.toFixed(1)}`;
  const investmentLabel = `貯玉${usedStoredBalls}発 + ${investmentYen.toLocaleString("ja-JP")}円`;

  return {
    playCount,
    totalBalls,
    totalDelta,
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
  };
}
