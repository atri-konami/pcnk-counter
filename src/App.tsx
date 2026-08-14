import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  canAddSpin,
  displayKindLabel,
  exchangeRateSelectOptions,
  formatHeldDisplay,
  formatInvestmentDisplay,
  groupHistoryRows,
  groupedRowDeltaLabel,
  groupedRowIndexLabel,
  groupedRowKindClass,
  groupedRowKindLabel,
  groupedRowTotalLabel,
  heldDisplayAriaLabel,
  heldDisplayModeLabel,
  INVESTMENT_INCREMENTS,
  investmentDisplayAriaLabel,
  investmentDisplayModeLabel,
  lastCopiedTotalSpins,
  lastGameplayRecord,
  lendRateSelectOptions,
  needsNewBaseline,
  nextHeldDisplayMode,
  nextInvestmentDisplayMode,
  parseNonNegativeInt,
  parseNonNegativeNumber,
  playModeHint,
  resolveJackpotCash,
  rowIndexLabel,
  rowTotalLabel,
  summarize,
  unitYenFromSettings,
  type RecordRow,
} from "./lib/calc";
import {
  archiveCurrentSession,
  defaultSessionName,
  deleteSavedSession,
  loadState,
  saveState,
  type SavedSession,
} from "./lib/storage";
import "./App.css";

function formatSavedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryRowCells({ row }: { row: RecordRow }) {
  return (
    <>
      <span className="row-index">{rowIndexLabel(row)}</span>
      <span className="row-total">{rowTotalLabel(row)}</span>
      <span className="row-delta">
        {row.delta === null ? "—" : `+${row.delta}`}
      </span>
      <span className={`row-kind ${row.displayKind}`}>
        {displayKindLabel(row.displayKind)}
      </span>
    </>
  );
}

function HistoryList({ rows }: { rows: RecordRow[] }) {
  if (rows.length === 0) {
    return <p className="empty">記録がありません。</p>;
  }
  const items = groupHistoryRows(rows);
  return (
    <ol className="history-list">
      {items.map((item) =>
        item.type === "single" ? (
          <li
            key={`${item.row.totalSpins}-${item.row.displayKind}-${item.index}`}
            className={item.row.isStart ? "start" : ""}
          >
            <HistoryRowCells row={item.row} />
          </li>
        ) : (
          <li
            key={`${item.rows[0].totalSpins}-${item.rows[0].displayKind}-${item.index}-group`}
            className="history-group"
          >
            <details>
              <summary>
                <div className="history-group-head">
                  <span className="row-index">
                    {groupedRowIndexLabel(item.rows)}
                  </span>
                  <span className="row-total">
                    {groupedRowTotalLabel(item.rows)}
                  </span>
                  <span className="row-delta">
                    {groupedRowDeltaLabel(item.rows)}
                  </span>
                  <span className={`row-kind ${groupedRowKindClass(item.rows)}`}>
                    {groupedRowKindLabel(item.rows)}
                  </span>
                </div>
              </summary>
              <ol className="history-group-rows">
                {item.rows.map((row, offset) => (
                  <li
                    key={`${row.totalSpins}-${row.displayKind}-${item.index + offset}`}
                  >
                    <HistoryRowCells row={row} />
                  </li>
                ))}
              </ol>
            </details>
          </li>
        ),
      )}
    </ol>
  );
}

function PastSessionItem({
  session,
  onDelete,
}: {
  session: SavedSession;
  onDelete: (id: string) => void;
}) {
  const summary = useMemo(
    () => summarize(session.records, session.settings, session.border),
    [session],
  );

  return (
    <li>
      <details className="session-item">
        <summary>
          <span className="session-item-main">
            <strong className="session-item-name">{session.name}</strong>
            <span className="session-item-meta">{formatSavedAt(session.savedAt)}</span>
          </span>
          <span className="session-item-stats">
            {summary.averageLabel}
            {summary.borderDiffLabel ? ` (${summary.borderDiffLabel})` : ""} /{" "}
            {summary.investmentLabel}
          </span>
        </summary>
        <HistoryList rows={summary.rows} />
        <button
          type="button"
          className="danger"
          onClick={(event) => {
            event.preventDefault();
            onDelete(session.id);
          }}
        >
          削除
        </button>
      </details>
    </li>
  );
}

function formatBorderInput(border: number | null): string {
  return border === null ? "" : String(border);
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [input, setInput] = useState("");
  const [jackpotSpins, setJackpotSpins] = useState("");
  const [jackpotCash, setJackpotCash] = useState("");
  const [jackpotHeld, setJackpotHeld] = useState("");
  const [jackpotOpen, setJackpotOpen] = useState(false);
  const [borderInput, setBorderInput] = useState(() =>
    formatBorderInput(state.border),
  );
  const [settingInputs, setSettingInputs] = useState({
    storedBalls: String(state.settings.storedBalls),
    unitBalls: String(state.settings.unitBalls),
  });
  const [heldAdjustInput, setHeldAdjustInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const result = saveState(state);
    if (!result.ok) {
      setError(
        result.quotaExceeded
          ? "保存容量がいっぱいです。古いセッションを削除してください"
          : "保存に失敗しました",
      );
    }
  }, [state]);

  const summary = useMemo(
    () => summarize(state.records, state.settings, state.border),
    [state],
  );

  const isStart = lastGameplayRecord(state.records) === undefined;
  const isBaseline = needsNewBaseline(state.records);
  const lastRecord = state.records[state.records.length - 1];
  const canUndoInvestment = lastRecord?.kind === "adjustInvestment";
  const cashIgnored =
    summary.playMode === "held" || summary.playMode === "remainder";
  const modeHint = playModeHint(
    summary.playMode,
    summary.playMode === "held" ? summary.heldBalls : summary.remainderBalls,
  );

  const heldDisplay = formatHeldDisplay(
    summary.heldBalls,
    state.settings.exchangeBalls,
    state.heldDisplayMode,
  );
  const investmentDisplay = formatInvestmentDisplay(
    summary.usedStoredBalls,
    summary.investmentYen,
    state.settings.exchangeBalls,
    state.investmentDisplayMode,
  );
  const unitYen = unitYenFromSettings(state.settings);
  const lendRateOptions = lendRateSelectOptions(state.settings.lendRateYen);
  const exchangeRateOptions = exchangeRateSelectOptions(
    state.settings.exchangeBalls,
  );

  function updateSetting(key: "storedBalls" | "unitBalls", raw: string) {
    setSettingInputs((prev) => ({ ...prev, [key]: raw }));
    const parsed = parseNonNegativeInt(raw);
    if (parsed === null) {
      return;
    }
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: key === "unitBalls" ? Math.max(1, parsed) : parsed,
      },
    }));
  }

  function commitSetting(key: "storedBalls" | "unitBalls") {
    setSettingInputs((prev) => {
      const parsed = parseNonNegativeInt(prev[key]);
      if (parsed === null) {
        return { ...prev, [key]: String(state.settings[key]) };
      }
      const value = key === "unitBalls" ? Math.max(1, parsed) : parsed;
      return { ...prev, [key]: String(value) };
    });
  }

  function updateLendRate(raw: string) {
    const parsed = parseNonNegativeInt(raw);
    if (parsed === null) {
      return;
    }
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, lendRateYen: parsed },
    }));
  }

  function updateExchangeRate(raw: string) {
    const parsed = parseNonNegativeInt(raw);
    if (parsed === null) {
      return;
    }
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        exchangeBalls: Math.max(1, parsed),
      },
    }));
  }

  function cycleHeldDisplay() {
    setState((prev) => ({
      ...prev,
      heldDisplayMode: nextHeldDisplayMode(prev.heldDisplayMode),
    }));
  }

  function cycleInvestmentDisplay() {
    setState((prev) => ({
      ...prev,
      investmentDisplayMode: nextInvestmentDisplayMode(prev.investmentDisplayMode),
    }));
  }

  function updateBorder(raw: string) {
    setBorderInput(raw);
    if (raw.trim() === "") {
      setState((prev) => ({ ...prev, border: null }));
      return;
    }
    const parsed = parseNonNegativeNumber(raw);
    if (parsed === null) {
      return;
    }
    setState((prev) => ({ ...prev, border: parsed }));
  }

  function clearJackpotInputs() {
    setJackpotSpins("");
    setJackpotCash("");
    setJackpotHeld("");
  }

  function onAdd(event: FormEvent) {
    event.preventDefault();
    const next = parseNonNegativeInt(input);
    if (next === null) {
      setError("0以上の整数を入力してください");
      return;
    }
    if (!canAddSpin(state.records, next)) {
      setError("直前の総回転数以上を入力してください");
      return;
    }
    setState((prev) => ({
      ...prev,
      records: [
        ...prev.records,
        {
          totalSpins: next,
          kind: needsNewBaseline(prev.records) ? "start" : "play",
        },
      ],
    }));
    setInput("");
    setError(null);
  }

  function onAddJackpot(event: FormEvent) {
    event.preventDefault();
    const next = parseNonNegativeInt(jackpotSpins);
    if (next === null) {
      setError("大当たりの回転数は0以上の整数を入力してください");
      return;
    }
    if (!canAddSpin(state.records, next)) {
      setError("直前の総回転数以上を入力してください");
      return;
    }
    const held = parseNonNegativeInt(jackpotHeld);
    if (held === null) {
      setError("終了時の持ち玉は0以上の整数を入力してください");
      return;
    }
    const cash = resolveJackpotCash(summary.playMode, jackpotCash);
    if (!cash.ok) {
      setError(cash.error);
      return;
    }
    setState((prev) => ({
      ...prev,
      records: [
        ...prev.records,
        {
          totalSpins: next,
          kind: "jackpot",
          cashYen: cash.cashYen,
          heldBalls: held,
        },
      ],
    }));
    clearJackpotInputs();
    setJackpotOpen(false);
    setError(null);
  }

  function onAddInvestment(yen: number) {
    setState((prev) => ({
      ...prev,
      records: [
        ...prev.records,
        {
          totalSpins: lastCopiedTotalSpins(prev.records),
          kind: "adjustInvestment",
          cashYen: yen,
        },
      ],
    }));
    setError(null);
  }

  function undoLastInvestment() {
    setState((prev) => {
      const last = prev.records[prev.records.length - 1];
      if (!last || last.kind !== "adjustInvestment") {
        return prev;
      }
      return { ...prev, records: prev.records.slice(0, -1) };
    });
    setError(null);
  }

  function onSetHeld(event: FormEvent) {
    event.preventDefault();
    const held = parseNonNegativeInt(heldAdjustInput);
    if (held === null) {
      setError("持ち玉は0以上の整数を入力してください");
      return;
    }
    setState((prev) => ({
      ...prev,
      records: [
        ...prev.records,
        {
          totalSpins: lastCopiedTotalSpins(prev.records),
          kind: "adjustHeld",
          heldBalls: held,
        },
      ],
    }));
    setHeldAdjustInput("");
    setError(null);
  }

  function undoLast() {
    setState((prev) => ({ ...prev, records: prev.records.slice(0, -1) }));
    setError(null);
  }

  function saveAndReset() {
    if (state.records.length === 0) {
      return;
    }
    const name = state.sessionName.trim() || defaultSessionName();
    if (
      !window.confirm(
        `「${name}」を保存してリセットしますか？（貯玉・設定は残ります。ボーダーはリセットされます）`,
      )
    ) {
      return;
    }
    setState((prev) => archiveCurrentSession(prev));
    setInput("");
    setBorderInput("");
    setHeldAdjustInput("");
    clearJackpotInputs();
    setJackpotOpen(false);
    setError(null);
  }

  function onDeleteSession(id: string) {
    const session = state.sessions.find((item) => item.id === id);
    if (!session) {
      return;
    }
    if (!window.confirm(`「${session.name}」を削除しますか？`)) {
      return;
    }
    setState((prev) => deleteSavedSession(prev, id));
    setError(null);
  }

  const spinsLabel = isBaseline
    ? "開始回転数"
    : summary.playMode === "remainder"
      ? "端数"
      : "総回転数";
  const spinsPlaceholder = isBaseline
    ? isStart
      ? "開始時の総回転数"
      : "リセット後の開始回転数"
    : summary.playMode === "remainder"
      ? "打ち切ったあとの総回転数"
      : "データカウンターの総回転数";

  return (
    <div className="app">
      <header className="header">
        <h1>回転数カウンター</h1>
        <p className="subtitle">打ち出しごとの総回転数を記録</p>
      </header>

      <section className="summary" aria-label="集計">
        <div className="summary-card highlight">
          <span className="label">平均</span>
          <div className="value-row">
            <strong className="value">{summary.averageLabel}</strong>
            {summary.borderDiffLabel ? (
              <span
                className={`subvalue ${
                  summary.borderDiff != null && summary.borderDiff >= 0
                    ? "plus"
                    : "minus"
                }`}
              >
                {summary.borderDiffLabel}
              </span>
            ) : null}
          </div>
          <span className="subvalue">
            {summary.totalDelta.toLocaleString("ja-JP")}回転
          </span>
        </div>
        <button
          type="button"
          className="summary-card"
          onClick={cycleHeldDisplay}
          aria-label={heldDisplayAriaLabel(state.heldDisplayMode)}
        >
          <span className="label">
            持ち玉
            <span className="mode">{heldDisplayModeLabel(state.heldDisplayMode)}</span>
          </span>
          <strong className="value">{heldDisplay.value}</strong>
          <span
            className="subvalue"
            aria-hidden={heldDisplay.subvalue ? undefined : true}
          >
            {heldDisplay.subvalue ?? "\u00a0"}
          </span>
        </button>
        <button
          type="button"
          className="summary-card wide"
          onClick={cycleInvestmentDisplay}
          aria-label={investmentDisplayAriaLabel(state.investmentDisplayMode)}
        >
          <span className="label">
            投資額
            <span className="mode">{investmentDisplayModeLabel(state.investmentDisplayMode)}</span>
          </span>
          <strong className="value">{investmentDisplay.value}</strong>
        </button>
      </section>

      <details className="settings adjust">
        <summary>投資額・持ち玉のセット</summary>
        <div className="adjust-body">
          <div className="adjust-block">
            <span className="adjust-label">投資額</span>
            <div className="adjust-buttons">
              {INVESTMENT_INCREMENTS.map((yen) => (
                <button
                  key={yen}
                  type="button"
                  onClick={() => onAddInvestment(yen)}
                >
                  +{yen.toLocaleString("ja-JP")}
                </button>
              ))}
              <button
                type="button"
                onClick={undoLastInvestment}
                disabled={!canUndoInvestment}
              >
                Undo
              </button>
            </div>
          </div>
          <form className="adjust-block" onSubmit={onSetHeld}>
            <label htmlFor="adjust-held">持ち玉</label>
            <div className="entry-row">
              <input
                id="adjust-held"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={heldAdjustInput}
                onChange={(e) => {
                  setHeldAdjustInput(e.target.value);
                  setError(null);
                }}
                placeholder="セットする持ち玉"
                autoComplete="off"
              />
              <button type="submit" className="primary">
                セット
              </button>
            </div>
          </form>
        </div>
      </details>

      <label className="session-name">
        セッション名
        <input
          type="text"
          value={state.sessionName}
          onChange={(e) => {
            setState((prev) => ({ ...prev, sessionName: e.target.value }));
            setError(null);
          }}
          placeholder="機種名・日付など"
          autoComplete="off"
        />
      </label>

      <form className="entry" onSubmit={onAdd}>
        <label htmlFor="spins">{spinsLabel}</label>
        <div className="entry-row">
          <input
            id="spins"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            placeholder={spinsPlaceholder}
            autoComplete="off"
          />
          <button type="submit" className="primary">
            追加
          </button>
        </div>
        {isBaseline && !isStart ? (
          <p className="hint">
            大当たり後は回転数がリセットされるため、開始時と同様に新しい開始回転数を入力してください。
          </p>
        ) : null}
        {modeHint ? <p className="hint">{modeHint}</p> : null}
      </form>

      {!isStart ? (
        <details
          className="settings jackpot-panel"
          open={jackpotOpen}
          onToggle={(event) => {
            setJackpotOpen(event.currentTarget.open);
          }}
        >
          <summary>大当たり</summary>
          <form className="jackpot-form" onSubmit={onAddJackpot}>
            <label htmlFor="jackpot-spins">大当たり時の総回転数</label>
            <input
              id="jackpot-spins"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={jackpotSpins}
              onChange={(e) => {
                setJackpotSpins(e.target.value);
                setError(null);
              }}
              placeholder="大当たりしたときの総回転数"
              autoComplete="off"
            />
            <label htmlFor="jackpot-cash">前回記録からの現金（円）</label>
            <input
              id="jackpot-cash"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={cashIgnored ? "" : jackpotCash}
              onChange={(e) => {
                setJackpotCash(e.target.value);
                setError(null);
              }}
              placeholder="貯玉・持ち玉中は空欄"
              autoComplete="off"
              disabled={cashIgnored}
            />
            <label htmlFor="jackpot-held">終了時の持ち玉</label>
            <div className="entry-row">
              <input
                id="jackpot-held"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={jackpotHeld}
                onChange={(e) => {
                  setJackpotHeld(e.target.value);
                  setError(null);
                }}
                placeholder="大当たり終了時の持ち玉"
                autoComplete="off"
              />
              <button type="submit" className="jackpot">
                記録
              </button>
            </div>
          </form>
        </details>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <div className="actions">
        <button type="button" onClick={undoLast} disabled={state.records.length === 0}>
          直前を取り消す
        </button>
        <button type="button" onClick={saveAndReset} disabled={state.records.length === 0}>
          保存してリセット
        </button>
      </div>

      <section className="history" aria-label="履歴">
        <h2>履歴</h2>
        {summary.rows.length === 0 ? (
          <p className="empty">まだ記録がありません。開始回転数を入力してください。</p>
        ) : (
          <HistoryList rows={summary.rows} />
        )}
      </section>

      <details className="settings past-sessions">
        <summary>過去セッション（{state.sessions.length}）</summary>
        {state.sessions.length === 0 ? (
          <p className="empty">保存したセッションはありません。</p>
        ) : (
          <ul className="session-list">
            {state.sessions.map((session) => (
              <PastSessionItem
                key={session.id}
                session={session}
                onDelete={onDeleteSession}
              />
            ))}
          </ul>
        )}
      </details>

      <details className="settings footer-settings">
        <summary>設定（貯玉・基準玉数・貸出/換金・ボーダー）</summary>
        <div className="settings-grid">
          <label>
            貯玉（発）
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={settingInputs.storedBalls}
              onChange={(e) => updateSetting("storedBalls", e.target.value)}
              onBlur={() => commitSetting("storedBalls")}
            />
          </label>
          <label>
            基準玉数
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={settingInputs.unitBalls}
              onChange={(e) => updateSetting("unitBalls", e.target.value)}
              onBlur={() => commitSetting("unitBalls")}
            />
          </label>
          <label>
            貸出レート
            <select
              value={state.settings.lendRateYen}
              onChange={(e) => updateLendRate(e.target.value)}
            >
              {lendRateOptions.map((option) => (
                <option key={option.yen} value={option.yen}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            換金レート
            <select
              value={state.settings.exchangeBalls}
              onChange={(e) => updateExchangeRate(e.target.value)}
            >
              {exchangeRateOptions.map((option) => (
                <option key={option.balls} value={option.balls}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            投資単価（円）
            <input
              type="text"
              className="computed"
              value={unitYen.toLocaleString("ja-JP")}
              readOnly
              tabIndex={-1}
              aria-readonly="true"
            />
          </label>
          <label>
            ボーダー（回転/k）
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.1}
              value={borderInput}
              onChange={(e) => updateBorder(e.target.value)}
              placeholder="未入力"
            />
          </label>
        </div>
        <ul className="settings-notes">
          <li>投資単価は基準玉数 × 貸出レートです。</li>
          <li>貯玉は基準玉数で割った行数ぶん投資に含めません。</li>
          <li>端数の貯玉は持ち玉の端数と同じく平均対象外です。</li>
          <li>投資額の貯玉は消化した玉数です。</li>
          <li>大当たりと端数は平均に含めません。</li>
          <li>ボーダーはセッション保存時にリセットされます。</li>
          <li>持ち玉と投資額はタップで表示を切り替えます。</li>
        </ul>
      </details>
    </div>
  );
}
