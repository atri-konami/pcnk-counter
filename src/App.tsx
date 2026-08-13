import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  canAddSpin,
  parseNonNegativeInt,
  summarize,
  type Settings,
} from "./lib/calc";
import { loadState, saveState } from "./lib/storage";
import "./App.css";

export default function App() {
  const [state, setState] = useState(loadState);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const summary = useMemo(
    () => summarize(state.records, state.settings),
    [state],
  );

  const isStart = state.records.length === 0;

  function updateSetting<K extends keyof Settings>(key: K, raw: string) {
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
    setState((prev) => ({ ...prev, records: [...prev.records, next] }));
    setInput("");
    setError(null);
  }

  function undoLast() {
    setState((prev) => ({ ...prev, records: prev.records.slice(0, -1) }));
    setError(null);
  }

  function resetSession() {
    if (state.records.length === 0) {
      return;
    }
    if (!window.confirm("このセッションの回転数記録を消しますか？（貯玉・設定は残ります）")) {
      return;
    }
    setState((prev) => ({ ...prev, records: [] }));
    setInput("");
    setError(null);
  }

  return (
    <div className="app">
      <header className="header">
        <h1>回転数カウンター</h1>
        <p className="subtitle">打ち出しごとの総回転数を記録</p>
      </header>

      <section className="summary" aria-label="集計">
        <div className="summary-card highlight">
          <span className="label">平均</span>
          <strong className="value">{summary.averageLabel}</strong>
        </div>
        <div className="summary-card">
          <span className="label">総玉数</span>
          <strong className="value">{summary.totalBalls.toLocaleString("ja-JP")}玉</strong>
        </div>
        <div className="summary-card wide">
          <span className="label">投資額</span>
          <strong className="value">{summary.investmentLabel}</strong>
        </div>
      </section>

      <details className="settings">
        <summary>設定（貯玉・基準玉数・投資単価）</summary>
        <div className="settings-grid">
          <label>
            貯玉（発）
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={state.settings.storedBalls}
              onChange={(e) => updateSetting("storedBalls", e.target.value)}
            />
          </label>
          <label>
            基準玉数
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={state.settings.unitBalls}
              onChange={(e) => updateSetting("unitBalls", e.target.value)}
            />
          </label>
          <label>
            投資単価（円）
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={state.settings.unitYen}
              onChange={(e) => updateSetting("unitYen", e.target.value)}
            />
          </label>
        </div>
        <p className="hint">
          貯玉は基準玉数で割った行数ぶん投資に含めません。端数は次の打ち出しを賄いません。
        </p>
      </details>

      <form className="entry" onSubmit={onAdd}>
        <label htmlFor="spins">
          {isStart ? "開始回転数" : "総回転数"}
        </label>
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
            placeholder={isStart ? "開始時の総回転数" : "データカウンターの総回転数"}
            autoComplete="off"
          />
          <button type="submit" className="primary">
            追加
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </form>

      <div className="actions">
        <button type="button" onClick={undoLast} disabled={state.records.length === 0}>
          直前を取り消す
        </button>
        <button type="button" onClick={resetSession} disabled={state.records.length === 0}>
          セッションをリセット
        </button>
      </div>

      <section className="history" aria-label="履歴">
        <h2>履歴</h2>
        {summary.rows.length === 0 ? (
          <p className="empty">まだ記録がありません。開始回転数を入力してください。</p>
        ) : (
          <ol className="history-list">
            {summary.rows.map((row, index) => (
              <li key={`${row.totalSpins}-${index}`} className={row.isStart ? "start" : ""}>
                <span className="row-index">
                  {row.isStart ? "開始" : `${row.playIndex}`}
                </span>
                <span className="row-total">{row.totalSpins.toLocaleString("ja-JP")}</span>
                <span className="row-delta">
                  {row.delta === null ? "—" : `+${row.delta}`}
                </span>
                <span className={`row-kind ${row.isStored ? "stored" : row.isStart ? "" : "paid"}`}>
                  {row.isStart ? "基準" : row.isStored ? "貯玉" : "現金"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
