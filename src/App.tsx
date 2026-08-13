import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  canAddSpin,
  parseNonNegativeInt,
  summarize,
  type RecordRow,
  type Settings,
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

function HistoryList({ rows }: { rows: RecordRow[] }) {
  if (rows.length === 0) {
    return <p className="empty">記録がありません。</p>;
  }
  return (
    <ol className="history-list">
      {rows.map((row, index) => (
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
    () => summarize(session.records, session.settings),
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
            {summary.averageLabel} / {summary.investmentLabel}
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

export default function App() {
  const [state, setState] = useState(loadState);
  const [input, setInput] = useState("");
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

  function saveAndReset() {
    if (state.records.length === 0) {
      return;
    }
    const name = state.sessionName.trim() || defaultSessionName();
    if (!window.confirm(`「${name}」を保存してリセットしますか？（貯玉・設定は残ります）`)) {
      return;
    }
    setState((prev) => archiveCurrentSession(prev));
    setInput("");
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
          貯玉は基準玉数で割った行数ぶん投資に含めません。投資額の貯玉は消化した玉数です。端数は次の打ち出しを賄いません。
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
    </div>
  );
}
